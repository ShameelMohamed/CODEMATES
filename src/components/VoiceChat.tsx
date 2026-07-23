"use client";

/**
 * VoiceChat — WebRTC audio call, signaled via Firebase Realtime Database.
 *
 * Why Firebase instead of y-webrtc awareness?
 *  • Firebase RTDB is persistent and always reachable (no public signaling server).
 *  • onValue / onChildAdded are guaranteed delivery — no polling race.
 *  • Session cleanup (remove()) is atomic and explicit.
 *
 * Flow:
 *  HOST  → creates offer → writes to RTDB → waits for answer & ICE candidates
 *  GUEST → reads offer   → creates answer → writes to RTDB → reads ICE candidates
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Activity, Mic, MicOff, Loader2, PhoneOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ref as dbRef, onValue, set, push, onChildAdded, remove } from "firebase/database";
import { db } from "@/lib/firebase";

// ── ICE server config ────────────────────────────────────────────────────────
// STUN handles most NAT traversal; free TURN helps with symmetric NATs.
const ICE_CONFIG: RTCConfiguration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject",
        },
        {
            urls: "turn:openrelay.metered.ca:443",
            username: "openrelayproject",
            credential: "openrelayproject",
        },
    ],
    iceCandidatePoolSize: 10,
};

type VoiceStatus = "connecting" | "connected" | "error";

// ── Component ────────────────────────────────────────────────────────────────
export default function VoiceChat({
    roomCode,
    isHost,
}: {
    roomCode: string;
    isHost: boolean;
}) {
    const [status, setStatus] = useState<VoiceStatus>("connecting");
    const [isMuted, setIsMuted] = useState(false);

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
    // Candidates received before remote description was set
    const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
    // Candidate strings already added (dedup across onChildAdded re-fires)
    const addedCandidateKeys = useRef<Set<string>>(new Set());

    const myRole = isHost ? "host" : "guest";
    const opponentRole = isHost ? "guest" : "host";

    // ── helpers ──────────────────────────────────────────────────────────────
    const addCandidateSafely = useCallback(
        async (pc: RTCPeerConnection, cand: RTCIceCandidateInit) => {
            const key = cand.candidate ?? "";
            if (!key || addedCandidateKeys.current.has(key)) return;
            addedCandidateKeys.current.add(key);

            if (pc.remoteDescription) {
                await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
            } else {
                // Queue until remote description is set
                pendingCandidates.current.push(cand);
            }
        },
        []
    );

    const drainPendingCandidates = useCallback(async (pc: RTCPeerConnection) => {
        const queue = [...pendingCandidates.current];
        pendingCandidates.current = [];
        for (const c of queue) {
            await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
    }, []);

    // ── main init effect ─────────────────────────────────────────────────────
    useEffect(() => {
        if (!roomCode) return;

        let isMounted = true;
        const cleanups: Array<() => void> = [];

        async function initVoice() {
            // ── 1. Acquire microphone ────────────────────────────────────────
            let stream: MediaStream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            } catch {
                if (isMounted) setStatus("error");
                return;
            }
            if (!isMounted) { stream.getTracks().forEach((t) => t.stop()); return; }
            localStreamRef.current = stream;

            // ── 2. Create PeerConnection ─────────────────────────────────────
            const pc = new RTCPeerConnection(ICE_CONFIG);
            pcRef.current = pc;

            stream.getTracks().forEach((track) => pc.addTrack(track, stream));

            // When we receive remote audio
            pc.ontrack = (ev) => {
                if (remoteAudioRef.current) {
                    remoteAudioRef.current.srcObject = ev.streams[0];
                }
            };

            // Connection state monitoring
            const onConnState = () => {
                if (!isMounted) return;
                if (pc.connectionState === "connected") setStatus("connected");
                if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
                    setStatus("error");
                }
            };
            const onIceConnState = () => {
                if (!isMounted) return;
                if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
                    setStatus("connected");
                }
            };
            pc.addEventListener("connectionstatechange", onConnState);
            pc.addEventListener("iceconnectionstatechange", onIceConnState);

            // ── 3. Publish my ICE candidates to RTDB ─────────────────────────
            pc.onicecandidate = ({ candidate }) => {
                if (candidate && isMounted) {
                    push(
                        dbRef(db, `rooms/${roomCode}/voice/${myRole}Candidates`),
                        candidate.toJSON()
                    ).catch(() => {});
                }
            };

            // ── 4. Listen to opponent's ICE candidates via onChildAdded ──────
            // onChildAdded fires for existing children first, then new ones —
            // so we get all candidates reliably without missing early ones.
            const oppCandUnsub = onChildAdded(
                dbRef(db, `rooms/${roomCode}/voice/${opponentRole}Candidates`),
                (snap) => {
                    const cand = snap.val();
                    if (cand && isMounted) addCandidateSafely(pc, cand);
                }
            );
            cleanups.push(oppCandUnsub);

            // ── 5a. HOST: clear old session, create offer ────────────────────
            if (isHost) {
                // Clear previous signaling data so the guest always gets a fresh session
                await remove(dbRef(db, `rooms/${roomCode}/voice`));

                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                await set(dbRef(db, `rooms/${roomCode}/voice/offer`), {
                    type: offer.type,
                    sdp: offer.sdp,
                });

                // Wait for guest's answer
                const answerUnsub = onValue(
                    dbRef(db, `rooms/${roomCode}/voice/answer`),
                    async (snap) => {
                        const answer = snap.val();
                        if (
                            answer &&
                            !pc.currentRemoteDescription &&
                            pc.signalingState !== "closed"
                        ) {
                            await pc
                                .setRemoteDescription(new RTCSessionDescription(answer))
                                .catch(() => {});
                            await drainPendingCandidates(pc);
                        }
                    }
                );
                cleanups.push(answerUnsub);

            // ── 5b. GUEST: wait for offer, create answer ─────────────────────
            } else {
                const offerUnsub = onValue(
                    dbRef(db, `rooms/${roomCode}/voice/offer`),
                    async (snap) => {
                        const offer = snap.val();
                        if (
                            offer &&
                            !pc.currentRemoteDescription &&
                            pc.signalingState !== "closed"
                        ) {
                            // Set remote description → drain queued candidates
                            await pc
                                .setRemoteDescription(new RTCSessionDescription(offer))
                                .catch(() => {});
                            await drainPendingCandidates(pc);

                            // Create and publish answer
                            const answer = await pc.createAnswer();
                            await pc.setLocalDescription(answer);
                            await set(dbRef(db, `rooms/${roomCode}/voice/answer`), {
                                type: answer.type,
                                sdp: answer.sdp,
                            });
                        }
                    }
                );
                cleanups.push(offerUnsub);
            }
        }

        initVoice().catch(() => {
            if (isMounted) setStatus("error");
        });

        return () => {
            isMounted = false;
            cleanups.forEach((fn) => fn());
            pcRef.current?.close();
            localStreamRef.current?.getTracks().forEach((t) => t.stop());
        };
    }, [isHost, roomCode, myRole, opponentRole, addCandidateSafely, drainPendingCandidates]);

    // ── mute toggle ──────────────────────────────────────────────────────────
    const toggleMute = useCallback(() => {
        localStreamRef.current?.getAudioTracks().forEach((t) => {
            t.enabled = !t.enabled;
        });
        setIsMuted((v) => !v);
    }, []);

    // ── render ───────────────────────────────────────────────────────────────
    return (
        <div className="flex items-center gap-1.5">
            <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

            <AnimatePresence mode="wait">
                {status === "connecting" && (
                    <motion.div
                        key="connecting"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-1.5 text-xs text-indigo-400 font-mono tracking-wider uppercase"
                    >
                        <Loader2 size={14} className="animate-spin" />
                        Syncing
                    </motion.div>
                )}

                {status === "connected" && (
                    <motion.div
                        key="connected"
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        className="flex items-center gap-1.5 bg-emerald-500/12 text-emerald-400 border border-emerald-500/25 px-2.5 py-1.5 rounded-lg font-bold text-xs shadow-[0_0_8px_rgba(52,211,153,0.15)]"
                    >
                        <Activity size={14} className="animate-pulse" />
                        VOICE
                    </motion.div>
                )}

                {status === "error" && (
                    <motion.div
                        key="error"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-1.5 text-xs text-red-400/70 font-mono"
                    >
                        <PhoneOff size={14} />
                        No Mic
                    </motion.div>
                )}
            </AnimatePresence>

            {status !== "error" && (
                <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={toggleMute}
                    title={isMuted ? "Unmute" : "Mute"}
                    className={`p-2 rounded-lg border transition-all duration-200 ${
                        isMuted
                            ? "bg-red-500/15 border-red-500/30 text-red-400 shadow-[0_0_6px_rgba(239,68,68,0.2)]"
                            : "bg-white/[0.04] border-white/[0.08] text-slate-500 hover:text-slate-300 hover:bg-white/[0.08]"
                    }`}
                >
                    {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                </motion.button>
            )}
        </div>
    );
}
