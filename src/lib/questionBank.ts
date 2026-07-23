export interface TestCase {
    input: string;
    expectedOutput: string;
}

export interface Question {
    id: string;
    title: string;
    description: string;
    mode: "BUG_HUNT" | "CODE_GOLF" | "SYNTAX_SPRINT";
    targetCode?: string;
    starterCode?: string;
    testCases?: TestCase[];
}

// 50 Highly Structured Python Challenges
export const questionBank: Question[] = [
    // -------------------------------- BUG_HUNT (15 Questions) --------------------------------
    {
        id: "bh1",
        title: "Two Sum (Buggy)",
        description: "Fix the bug so it returns the indices of the two numbers that add up to target.",
        mode: "BUG_HUNT",
        starterCode: "def solve(nums, target):\n    for i in range(len(nums)):\n        for j in range(i, len(nums)): # BUG: should be i+1\n            if nums[i] + nums[j] == target:\n                return [i, j]\n    return []\n\nimport sys\n# Execution Harness -- Do not modify\ninput_data = sys.stdin.read().split()\nif input_data:\n    target = int(input_data[-1])\n    nums = [int(x) for x in input_data[:-1]]\n    print(solve(nums, target))",
        testCases: [{ input: "2 7 11 15\n9", expectedOutput: "[0, 1]\n" }, { input: "3 2 4\n6", expectedOutput: "[1, 2]\n" }]
    },
    {
        id: "bh2",
        title: "Valid Anagram (Buggy)",
        description: "Fix the bug in the anagram checker.",
        mode: "BUG_HUNT",
        starterCode: "def solve(s, t):\n    return set(s) == set(t) # BUG: Sets don't count frequencies\n\nimport sys\ninput_data = sys.stdin.read().split()\nif input_data:\n    print(solve(input_data[0], input_data[1]))",
        testCases: [{ input: "anagram nagaram", expectedOutput: "True\n" }, { input: "rat car", expectedOutput: "False\n" }]
    },
    {
        id: "bh3",
        title: "Reverse String (Buggy)",
        description: "Fix the off-by-one bug to reverse the string correctly.",
        mode: "BUG_HUNT",
        starterCode: "def solve(s):\n    return s[::-2] # BUG: Should be [::-1]\n\nimport sys\nprint(solve(sys.stdin.read().strip()))",
        testCases: [{ input: "hello", expectedOutput: "olleh\n" }]
    },
    {
        id: "bh4",
        title: "FizzBuzz (Buggy)",
        description: "FizzBuzz logic is broken. Order matters!",
        mode: "BUG_HUNT",
        starterCode: "def solve(n):\n    res = []\n    for i in range(1, n+1):\n        if i % 3 == 0: res.append('Fizz')\n        elif i % 5 == 0: res.append('Buzz')\n        elif i % 15 == 0: res.append('FizzBuzz') # BUG: 15 should be first\n        else: res.append(str(i))\n    return ' '.join(res)\n\nimport sys\nif sys.stdin.read().strip():\n    print(solve(int(sys.stdin.read().strip())))",
        testCases: [{ input: "15", expectedOutput: "1 2 Fizz 4 Buzz Fizz 7 8 Fizz Buzz 11 Fizz 13 14 FizzBuzz\n" }]
    },
    { id: "bh5", title: "Find Max (Buggy)", description: "Fix the logic to find the max correctly.", mode: "BUG_HUNT", starterCode: "def solve(arr):\n    max_val = 0 # BUG: Fails on negatives\n    for n in arr:\n        if n > max_val: max_val = n\n    return max_val\n\nimport sys\narr = [int(x) for x in sys.stdin.read().split()]\nprint(solve(arr))", testCases: [{ input: "-5 -2 -9", expectedOutput: "-2\n" }] },
    { id: "bh6", title: "Contains Duplicate (Buggy)", description: "Fix the set length comparison.", mode: "BUG_HUNT", starterCode: "def solve(nums):\n    return len(set(nums)) == len(nums) # BUG: Wait, it expects True for duplicates\n\nimport sys\nnums = [int(x) for x in sys.stdin.read().split()]\nprint(solve(nums))", testCases: [{ input: "1 2 3 1", expectedOutput: "True\n" }] },
    { id: "bh7", title: "Is Palindrome (Buggy)", description: "Fix the palindrome check.", mode: "BUG_HUNT", starterCode: "def solve(s):\n    s = s.lower()\n    return s == s.reverse() # BUG: reverse() doesn't exist for strings\n\nimport sys\nprint(solve(sys.stdin.read().strip()))", testCases: [{ input: "racecar", expectedOutput: "True\n" }] },
    { id: "bh8", title: "Factorial (Buggy)", description: "Base case is wrong.", mode: "BUG_HUNT", starterCode: "def solve(n):\n    if n == 0: return 0 # BUG: 0! is 1\n    return n * solve(n-1)\n\nimport sys\nprint(solve(int(sys.stdin.read().strip())))", testCases: [{ input: "5", expectedOutput: "120\n" }] },
    { id: "bh9", title: "Sum Array (Buggy)", description: "Typo in variable update.", mode: "BUG_HUNT", starterCode: "def solve(arr):\n    s = 0\n    for n in arr: s -= n # BUG: should be +=\n    return s\n\nimport sys\narr = [int(x) for x in sys.stdin.read().split()]\nprint(solve(arr))", testCases: [{ input: "1 2 3", expectedOutput: "6\n" }] },
    { id: "bh10", title: "Count Vowels (Buggy)", description: "Missing vowels in check.", mode: "BUG_HUNT", starterCode: "def solve(s):\n    return sum(1 for c in s if c in 'aeio') # BUG: missing u\n\nimport sys\nprint(solve(sys.stdin.read().strip().lower()))", testCases: [{ input: "universe", expectedOutput: "4\n" }] },
    { id: "bh11", title: "List Append (Buggy)", description: "Mutable default arg issue.", mode: "BUG_HUNT", starterCode: "def solve(item, lst=[]): # BUG: classic python gotcha\n    lst.append(item)\n    return lst\n\nimport sys\nprint(solve(1), solve(2))", testCases: [{ input: "dummy", expectedOutput: "[1] [2]\n" }] },
    { id: "bh12", title: "Dictionary Get (Buggy)", description: "Check KeyError.", mode: "BUG_HUNT", starterCode: "def solve(d, k):\n    return d[k] # BUG: Needs default fallback\n\nprint('fixed')", testCases: [{ input: "1", expectedOutput: "fixed\n" }] },
    { id: "bh13", title: "Sort by Length (Buggy)", description: "Key function wrong.", mode: "BUG_HUNT", starterCode: "def solve(arr):\n    return sorted(arr, key=str) # BUG: key=len\n\nimport sys\nprint(' '.join(solve(sys.stdin.read().split())))", testCases: [{ input: "apple a banana", expectedOutput: "a apple banana\n" }] },
    { id: "bh14", title: "Evens Only (Buggy)", description: "List comprehension error.", mode: "BUG_HUNT", starterCode: "def solve(arr):\n    return [x for x in arr if x % 2 == 1] # BUG: == 0\n\nimport sys\narr = [int(x) for x in sys.stdin.read().split()]\nprint(' '.join(map(str, solve(arr))))", testCases: [{ input: "1 2 3 4", expectedOutput: "2 4\n" }] },
    { id: "bh15", title: "Title Case (Buggy)", description: "Title method.", mode: "BUG_HUNT", starterCode: "def solve(s):\n    return s.upper() # BUG: title()\n\nimport sys\nprint(solve(sys.stdin.read().strip()))", testCases: [{ input: "hello world", expectedOutput: "Hello World\n" }] },

    // -------------------------------- CODE_GOLF (15 Questions) --------------------------------
    { id: "cg1", title: "Shortest Reverse", description: "Reverse a string in as few characters as possible.", mode: "CODE_GOLF", starterCode: "def solve(s):\n    return s\n\nimport sys\nprint(solve(sys.stdin.read().strip()))", testCases: [{ input: "golf", expectedOutput: "flog\n" }] },
    { id: "cg2", title: "Shortest Is Even", description: "Return 'Even' if n is even else 'Odd'.", mode: "CODE_GOLF", starterCode: "def solve(n):\n    pass\n\nimport sys\nprint(solve(int(sys.stdin.read().strip())))", testCases: [{ input: "4", expectedOutput: "Even\n" }] },
    { id: "cg3", title: "List Multiplication", description: "Multiply all numbers in a list.", mode: "CODE_GOLF", starterCode: "def solve(arr):\n    pass\n\nimport sys\narr = [int(x) for x in sys.stdin.read().split()]\nprint(solve(arr))", testCases: [{ input: "2 3 4", expectedOutput: "24\n" }] },
    { id: "cg4", title: "Count Char", description: "Count occurrences of the first char in the rest of the string.", mode: "CODE_GOLF", starterCode: "def solve(s):\n    pass\n\nimport sys\nprint(solve(sys.stdin.read().strip()))", testCases: [{ input: "abracadabra", expectedOutput: "5\n" }] },
    { id: "cg5", title: "Shortest Absolute", description: "Absolute value without abs()", mode: "CODE_GOLF", starterCode: "def solve(n):\n    pass\n\nimport sys\nprint(solve(int(sys.stdin.read().strip())))", testCases: [{ input: "-9", expectedOutput: "9\n" }] },
    { id: "cg6", title: "Find Max", description: "Find the max of list without max()", mode: "CODE_GOLF", starterCode: "def solve(arr):\n    pass\n\nimport sys\narr = [int(x) for x in sys.stdin.read().split()]\nprint(solve(arr))", testCases: [{ input: "1 5 9 2", expectedOutput: "9\n" }] },
    { id: "cg7", title: "Sum of Digits", description: "Sum the digits of a number.", mode: "CODE_GOLF", starterCode: "def solve(n):\n    pass\n\nimport sys\nprint(solve(sys.stdin.read().strip()))", testCases: [{ input: "1234", expectedOutput: "10\n" }] },
    { id: "cg8", title: "Square Elements", description: "Square all elements in a list.", mode: "CODE_GOLF", starterCode: "def solve(arr):\n    pass\n\nimport sys\narr = [int(x) for x in sys.stdin.read().split()]\nprint(' '.join(map(str, solve(arr))))", testCases: [{ input: "2 3", expectedOutput: "4 9\n" }] },
    { id: "cg9", title: "String Spaces", description: "Remove all spaces from string.", mode: "CODE_GOLF", starterCode: "def solve(s):\n    pass\n\nimport sys\nprint(solve(sys.stdin.read().strip()))", testCases: [{ input: "a b c", expectedOutput: "abc\n" }] },
    { id: "cg10", title: "First N Primes", description: "Print first N prime numbers.", mode: "CODE_GOLF", starterCode: "def solve(n):\n    pass\n", testCases: [] },
    { id: "cg11", title: "Check Power of 2", description: "Return True if power of 2.", mode: "CODE_GOLF", starterCode: "def solve(n):\n    pass\n\nimport sys\nprint(solve(int(sys.stdin.read().strip())))", testCases: [{ input: "16", expectedOutput: "True\n" }] },
    { id: "cg12", title: "Fibonacci N", description: "Return Nth fibonacci number.", mode: "CODE_GOLF", starterCode: "def solve(n):\n    pass\n\nimport sys\nprint(solve(int(sys.stdin.read().strip())))", testCases: [{ input: "6", expectedOutput: "8\n" }] },
    { id: "cg13", title: "Shortest Swap", description: "Swap vars x and y.", mode: "CODE_GOLF", starterCode: "def solve(x, y):\n    return x, y\n\nprint(solve(1, 2))", testCases: [{ input: "1", expectedOutput: "(2, 1)\n" }] },
    { id: "cg14", title: "Flatten List", description: "Flatten 2D list.", mode: "CODE_GOLF", starterCode: "def solve(arr2d):\n    pass\n\nprint(solve([[1,2],[3,4]]))", testCases: [{ input: "1", expectedOutput: "[1, 2, 3, 4]\n" }] },
    { id: "cg15", title: "Unique Chars", description: "Return unique chars as joined string sorted.", mode: "CODE_GOLF", starterCode: "def solve(s):\n    pass\n\nimport sys\nprint(solve(sys.stdin.read().strip()))", testCases: [{ input: "bbaac", expectedOutput: "abc\n" }] },


    // -------------------------------- SYNTAX_SPRINT (20 Questions) --------------------------------
    { id: "ss1", title: "Dictionary Comprehension", description: "Type this exactly.", mode: "SYNTAX_SPRINT", starterCode: "", targetCode: "squares = {x: x**2 for x in range(10) if x % 2 == 0}" },
    { id: "ss2", title: "Lambda Function Map", description: "Type this exactly.", mode: "SYNTAX_SPRINT", starterCode: "", targetCode: "result = list(map(lambda x: x.upper(), ['a', 'b', 'c']))" },
    { id: "ss3", title: "Decorator Pattern", description: "Type this exactly.", mode: "SYNTAX_SPRINT", starterCode: "", targetCode: "def timing_decorator(func):\n    def wrapper(*args, **kwargs):\n        start = time.time()\n        result = func(*args, **kwargs)\n        print(time.time() - start)\n        return result\n    return wrapper" },
    { id: "ss4", title: "List Comprehension", description: "Type this exactly.", mode: "SYNTAX_SPRINT", starterCode: "", targetCode: "evens = [x for x in numbers if x % 2 == 0]" },
    { id: "ss5", title: "Ternary Operator", description: "Type this exactly.", mode: "SYNTAX_SPRINT", starterCode: "", targetCode: "status = 'Active' if user.is_active else 'Inactive'" },
    { id: "ss6", title: "Context Manager", description: "Type this exactly.", mode: "SYNTAX_SPRINT", starterCode: "", targetCode: "with open('file.txt', 'r') as f:\n    content = f.read()" },
    { id: "ss7", title: "Generator Expression", description: "Type this exactly.", mode: "SYNTAX_SPRINT", starterCode: "", targetCode: "sum_squares = sum(x**2 for x in range(100))" },
    { id: "ss8", title: "Args and Kwargs", description: "Type this exactly.", mode: "SYNTAX_SPRINT", starterCode: "", targetCode: "def complex_function(*args, **kwargs):\n    for arg in args: print(arg)\n    for k, v in kwargs.items(): print(k, v)" },
    { id: "ss9", title: "Exception Handling", description: "Type this exactly.", mode: "SYNTAX_SPRINT", starterCode: "", targetCode: "try:\n    1 / 0\nexcept ZeroDivisionError as e:\n    print(f'Error: {e}')\nfinally:\n    print('Done')" },
    { id: "ss10", title: "String F-Formatting", description: "Type this exactly.", mode: "SYNTAX_SPRINT", starterCode: "", targetCode: "greeting = f'Hello {user.name}, you are {user.age:02d} years old!'" },
    { id: "ss11", title: "Multiple Inheritance", description: "Type this exactly.", mode: "SYNTAX_SPRINT", starterCode: "", targetCode: "class Hybrid(BaseMachine, AIInterface):\n    def __init__(self):\n        super().__init__()" },
    { id: "ss12", title: "Named Tuple", description: "Type this exactly.", mode: "SYNTAX_SPRINT", starterCode: "", targetCode: "from collections import namedtuple\nPoint = namedtuple('Point', ['x', 'y'])" },
    { id: "ss13", title: "Set Operations", description: "Type this exactly.", mode: "SYNTAX_SPRINT", starterCode: "", targetCode: "intersection = set_a & set_b\nunion = set_a | set_b\ndifference = set_a - set_b" },
    { id: "ss14", title: "Zip Iteration", description: "Type this exactly.", mode: "SYNTAX_SPRINT", starterCode: "", targetCode: "for name, score in zip(names, scores):\n    print(f'{name}: {score}')" },
    { id: "ss15", title: "Type Hinting", description: "Type this exactly.", mode: "SYNTAX_SPRINT", starterCode: "", targetCode: "def process(items: list[int]) -> dict[str, int]:\n    return {'count': len(items)}" },
    { id: "ss16", title: "Walrus Operator", description: "Type this exactly.", mode: "SYNTAX_SPRINT", starterCode: "", targetCode: "if (n := len(items)) > 10:\n    print(f'Too many items: {n}')" },
    { id: "ss17", title: "Property Decorator", description: "Type this exactly.", mode: "SYNTAX_SPRINT", starterCode: "", targetCode: "@property\ndef temperature(self):\n    return self._temperature\n\n@temperature.setter\ndef temperature(self, value):\n    self._temperature = value" },
    { id: "ss18", title: "Async Run", description: "Type this exactly.", mode: "SYNTAX_SPRINT", starterCode: "", targetCode: "import asyncio\n\nasync def main():\n    await fetch_data()\n\nasyncio.run(main())" },
    { id: "ss19", title: "Match Case", description: "Type this exactly.", mode: "SYNTAX_SPRINT", starterCode: "", targetCode: "match status:\n    case 200:\n        return 'Success'\n    case 404:\n        return 'Not Found'\n    case _:\n        return 'Unknown'" },
    { id: "ss20", title: "Dataclass", description: "Type this exactly.", mode: "SYNTAX_SPRINT", starterCode: "", targetCode: "from dataclasses import dataclass\n\n@dataclass\nclass InventoryItem:\n    name: str\n    unit_price: float\n    quantity_on_hand: int = 0" },
];
