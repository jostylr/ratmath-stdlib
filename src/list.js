
import { Rational, Integer } from "@ratmath/core";

/**
 * Helper to extract a sequence from a value.
 * If the value is a list accessor function (stored as a function with type 'list_accessor'),
 * this will return the underlying sequence. Otherwise returns the value as-is.
 * This allows Map(MyList, F) to work the same as Map(MyList(0), F).
 */
function extractSequence(value, vm) {
    if (value && value.type === 'sequence') {
        return value;
    }
    // Check if value is a function name (string) that is a list accessor
    if (typeof value === 'string' && vm && vm.functions) {
        const normalizedName = vm.normalizeName ? vm.normalizeName(value) : value;
        const funcDef = vm.functions.get(normalizedName);
        if (funcDef && funcDef.type === 'list_accessor') {
            return funcDef.list;
        }
    }
    return value;
}

export const List = {
    LEN: {
        handler: function (list) {
            const seq = extractSequence(list, this);
            if (seq && seq.type === 'sequence') {
                return new Integer(seq.values.length);
            }
            throw new Error("LEN expects a List (sequence or list accessor)");
        },
        params: ['list'],
        doc: `Returns the length (number of elements) of a list.

Usage: LEN(list)

Arguments:
  list - A list/sequence or list accessor variable

Examples:
  LEN([1, 2, 3])     → 3
  L = [5, 10, 15]
  LEN(L)             → 3`
    },

    GETEL: {
        handler: function (list, index) {
            const seq = extractSequence(list, this);
            if (!seq || seq.type !== 'sequence') throw new Error("GETEL expects a List");

            let idx = Number(index.toString());

            if (idx === 0) return seq;
            if (idx > 0) idx = idx - 1;
            if (idx < 0) idx = seq.values.length + idx;

            if (idx < 0 || idx >= seq.values.length) throw new Error(`Index ${index} out of bounds`);

            return seq.values[idx];
        },
        params: ['list', 'index'],
        doc: `Get element at index from a list (1-based indexing).

Usage: GETEL(list, index)

Arguments:
  list  - A list/sequence or list accessor variable
  index - 1-based index (positive from start, negative from end, 0 returns full list)

Examples:
  GETEL([10, 20, 30], 1)   → 10 (first element)
  GETEL([10, 20, 30], -1)  → 30 (last element)
  GETEL([10, 20, 30], 0)   → [10, 20, 30] (full list)`
    },

    IRANGE: {
        handler: function (start, end, step) {
            const s = BigInt(start.toString());
            const e = BigInt(end.toString());
            const inc = step ? BigInt(step.toString()) : 1n;

            const values = [];
            for (let i = s; i <= e; i += inc) {
                values.push(new Integer(i));
            }
            return { type: 'sequence', values, lastValue: values[values.length - 1] };
        },
        params: ['start', 'end', 'step?'],
        doc: `Generate a range of integers from start to end (inclusive).

Usage: IRANGE(start, end, step?)

Arguments:
  start - Starting integer
  end   - Ending integer (inclusive)
  step  - Optional step size (default: 1)

Examples:
  IRANGE(1, 5)      → [1, 2, 3, 4, 5]
  IRANGE(0, 10, 2)  → [0, 2, 4, 6, 8, 10]`
    },

    RANGE: {
        handler: function (interval, numSteps) {
            // interval should be a RationalInterval with .low and .high
            // numSteps must be at least 2
            
            let start, end;
            
            // Check if interval is a RationalInterval object (uses .low and .high)
            if (interval && interval.low !== undefined && interval.high !== undefined) {
                start = interval.low;
                end = interval.high;
            } else if (interval && typeof interval.toString === 'function') {
                throw new Error("RANGE expects an interval (a:b) as first argument");
            } else {
                throw new Error("RANGE expects an interval (a:b) as first argument");
            }
            
            // Parse numSteps
            const n = Number(numSteps.toString());
            if (!Number.isInteger(n) || n < 2) {
                throw new Error("RANGE requires numSteps to be an integer >= 2");
            }
            
            // Calculate step size: width / (n - 1)
            // width = end - start
            const width = end.subtract(start);
            const divisor = new Rational(BigInt(n - 1));
            const stepSize = width.divide(divisor);
            
            const values = [];
            let current = start;
            
            for (let i = 0; i < n; i++) {
                values.push(current);
                if (i < n - 1) {
                    current = current.add(stepSize);
                }
            }
            
            // Ensure last element is exactly 'end' to avoid floating point-like drift
            values[n - 1] = end;
            
            return { type: 'sequence', values, lastValue: end };
        },
        params: ['interval', 'numSteps'],
        doc: `Generate a list of evenly spaced rational numbers over an interval.

Usage: RANGE(a:b, numSteps)

Arguments:
  interval - A rational interval a:b (start:end)
  numSteps - Number of points to generate (must be >= 2)

The step size is calculated as: (b - a) / (numSteps - 1)
This ensures the list starts at 'a' and ends exactly at 'b'.

Examples:
  RANGE(0:1, 3)     → [0, 1/2, 1]
  RANGE(0:1, 5)     → [0, 1/4, 1/2, 3/4, 1]
  RANGE(1:3, 3)     → [1, 2, 3]
  RANGE(-1:1, 5)    → [-1, -1/2, 0, 1/2, 1]`
    },

    MAP: {
        handler: function (list, funcName) {
            const seq = extractSequence(list, this);
            if (!seq || seq.type !== 'sequence') throw new Error("MAP expects a List");
            const result = [];
            const chain = this._currentScopeChain;

            let fname = funcName;
            if (funcName?.type === 'string') fname = funcName.value;
            else if (typeof funcName === 'string') fname = funcName.replace(/^"|"$/g, '');

            const listStr = this.formatValueWithPrefix(seq);
            
            for (let i = 0; i < seq.values.length; i++) {
                const item = seq.values[i];
                const itemStr = this.formatValueWithPrefix(item);
                const indexStr = (i + 1).toString();
                // Call function with (element, index, list)
                const expr = `${fname}(${itemStr}, ${indexStr}, ${listStr})`;
                const r = this.evaluateExpression(expr, chain);
                if (r.type === 'error') throw new Error(`MAP Error: ${r.message}`);
                result.push(r.result);
            }
            return { type: 'sequence', values: result, lastValue: result[result.length - 1] };
        },
        params: ['list', 'Func'],
        doc: `Apply a function to each element of a list, returning a new list.

Usage: MAP(list, Func)

Arguments:
  list - A list/sequence or list accessor variable
  Func - Function to apply. Receives (element, index, list) where:
         - element: the current element
         - index: 1-based position in list
         - list: the full list
         The function can use just the first parameter if index/list aren't needed.

Examples:
  Double(x) -> 2*x
  MAP([1, 2, 3], Double)           → [2, 4, 6]
  
  AddIndex(x, i) -> x + i
  MAP([10, 20, 30], AddIndex)      → [11, 22, 33]
  
  MAP([1, 2, 3], x -> x^2)         → [1, 4, 9]`
    },

    FILTER: {
        handler: function (list, funcName) {
            const seq = extractSequence(list, this);
            if (!seq || seq.type !== 'sequence') throw new Error("FILTER expects a List");
            const result = [];
            const chain = this._currentScopeChain;

            let fname = funcName;
            if (funcName?.type === 'string') fname = funcName.value;
            else if (typeof funcName === 'string') fname = funcName.replace(/^"|"$/g, '');

            const listStr = this.formatValueWithPrefix(seq);

            for (let i = 0; i < seq.values.length; i++) {
                const item = seq.values[i];
                const itemStr = this.formatValueWithPrefix(item);
                const indexStr = (i + 1).toString();
                // Call function with (element, index, list)
                const expr = `${fname}(${itemStr}, ${indexStr}, ${listStr})`;
                const r = this.evaluateExpression(expr, chain);
                if (r.type === 'error') throw new Error(`FILTER Error: ${r.message}`);

                const val = r.result;
                let isTrue = false;
                if (val && val.sign) isTrue = val.sign() !== 0;
                else if (typeof val === 'number') isTrue = val !== 0;

                if (isTrue) result.push(item);
            }
            return { type: 'sequence', values: result, lastValue: result.length > 0 ? result[result.length - 1] : new Integer(0) };
        },
        params: ['list', 'Pred'],
        doc: `Filter elements of a list by a predicate function.

Usage: FILTER(list, Pred)

Arguments:
  list - A list/sequence or list accessor variable
  Pred - Predicate function that returns non-zero for elements to keep.
         Receives (element, index, list) where:
         - element: the current element
         - index: 1-based position in list
         - list: the full list

Examples:
  IsEven(x) -> EQ(MOD(x, 2), 0)
  FILTER([1, 2, 3, 4, 5], IsEven)   → [2, 4]
  
  IsPositive(x) -> GT(x, 0)
  FILTER([-1, 0, 1, 2], IsPositive) → [1, 2]
  
  FILTER([1, 2, 3], x -> GT(x, 1)) → [2, 3]`
    },

    REDUCE: {
        handler: function (list, funcName, initial) {
            const seq = extractSequence(list, this);
            if (!seq || seq.type !== 'sequence') throw new Error("REDUCE expects a List");
            let accumulator = initial;
            const chain = this._currentScopeChain;

            let fname = funcName;
            if (funcName?.type === 'string') fname = funcName.value;
            else if (typeof funcName === 'string') fname = funcName.replace(/^"|"$/g, '');

            const listStr = this.formatValueWithPrefix(seq);

            for (let i = 0; i < seq.values.length; i++) {
                const item = seq.values[i];
                const accStr = this.formatValueWithPrefix(accumulator);
                const itemStr = this.formatValueWithPrefix(item);
                const indexStr = (i + 1).toString();
                // Call function with (accumulator, element, index, list)
                const expr = `${fname}(${accStr}, ${itemStr}, ${indexStr}, ${listStr})`;
                const r = this.evaluateExpression(expr, chain);
                if (r.type === 'error') throw new Error(`REDUCE Error: ${r.message}`);
                accumulator = r.result;
            }
            return accumulator;
        },
        params: ['list', 'Func', 'initial'],
        doc: `Reduce a list to a single value using a binary function.

Usage: REDUCE(list, Func, initial)

Arguments:
  list    - A list/sequence or list accessor variable
  Func    - Reducer function. Receives (accumulator, element, index, list) where:
            - accumulator: the running accumulated value
            - element: the current element
            - index: 1-based position in list
            - list: the full list
  initial - Initial value for the accumulator

The function is called for each element, with the result becoming the new accumulator.

Examples:
  Add(a, b) -> a + b
  REDUCE([1, 2, 3, 4], Add, 0)     → 10 (sum)
  
  Mul(a, b) -> a * b
  REDUCE([1, 2, 3, 4], Mul, 1)     → 24 (product)
  
  Max(a, b) -> IF(GT(a, b), a, b)
  REDUCE([3, 1, 4, 1, 5], Max, 0)  → 5`
    },

    SOME: {
        handler: function (list, funcName) {
            const seq = extractSequence(list, this);
            if (!seq || seq.type !== 'sequence') throw new Error("SOME expects a List");
            const chain = this._currentScopeChain;

            let fname = funcName;
            if (funcName?.type === 'string') fname = funcName.value;
            else if (typeof funcName === 'string') fname = funcName.replace(/^"|"$/g, '');

            const listStr = this.formatValueWithPrefix(seq);

            for (let i = 0; i < seq.values.length; i++) {
                const item = seq.values[i];
                const itemStr = this.formatValueWithPrefix(item);
                const indexStr = (i + 1).toString();
                const expr = `${fname}(${itemStr}, ${indexStr}, ${listStr})`;
                const r = this.evaluateExpression(expr, chain);
                if (r.type === 'error') throw new Error(r.message);

                const val = r.result;
                let isTrue = false;
                if (val && val.sign) isTrue = val.sign() !== 0;
                if (isTrue) return new Integer(1);
            }
            return new Integer(0);
        },
        params: ['list', 'Pred'],
        doc: `Check if any element in a list satisfies a predicate.

Usage: SOME(list, Pred)

Arguments:
  list - A list/sequence or list accessor variable
  Pred - Predicate function. Receives (element, index, list).
         Returns non-zero if condition is met.

Returns 1 if at least one element satisfies the predicate, 0 otherwise.

Examples:
  IsNegative(x) -> LT(x, 0)
  SOME([1, 2, -3], IsNegative)    → 1
  SOME([1, 2, 3], IsNegative)     → 0`
    },

    ALL: {
        handler: function (list, funcName) {
            const seq = extractSequence(list, this);
            if (!seq || seq.type !== 'sequence') throw new Error("ALL expects a List");
            const chain = this._currentScopeChain;

            let fname = funcName;
            if (funcName?.type === 'string') fname = funcName.value;
            else if (typeof funcName === 'string') fname = funcName.replace(/^"|"$/g, '');

            const listStr = this.formatValueWithPrefix(seq);

            for (let i = 0; i < seq.values.length; i++) {
                const item = seq.values[i];
                const itemStr = this.formatValueWithPrefix(item);
                const indexStr = (i + 1).toString();
                const expr = `${fname}(${itemStr}, ${indexStr}, ${listStr})`;
                const r = this.evaluateExpression(expr, chain);
                if (r.type === 'error') throw new Error(r.message);

                const val = r.result;
                let isTrue = false;
                if (val && val.sign) isTrue = val.sign() !== 0;
                if (!isTrue) return new Integer(0);
            }
            return new Integer(1);
        },
        params: ['list', 'Pred'],
        doc: `Check if all elements in a list satisfy a predicate.

Usage: ALL(list, Pred)

Arguments:
  list - A list/sequence or list accessor variable
  Pred - Predicate function. Receives (element, index, list).
         Returns non-zero if condition is met.

Returns 1 if all elements satisfy the predicate, 0 otherwise.

Examples:
  IsPositive(x) -> GT(x, 0)
  ALL([1, 2, 3], IsPositive)      → 1
  ALL([1, -2, 3], IsPositive)     → 0`
    },

    FIRST: {
        handler: function (list) {
            const seq = extractSequence(list, this);
            if (!seq || seq.type !== 'sequence') throw new Error("FIRST expects a List");
            if (seq.values.length === 0) throw new Error("FIRST called on empty list");
            return seq.values[0];
        },
        params: ['list'],
        doc: `Get the first element of a list.

Usage: FIRST(list)

Arguments:
  list - A list/sequence or list accessor variable

Examples:
  FIRST([10, 20, 30])  → 10`
    },

    LAST: {
        handler: function (list) {
            const seq = extractSequence(list, this);
            if (!seq || seq.type !== 'sequence') throw new Error("LAST expects a List");
            if (seq.values.length === 0) throw new Error("LAST called on empty list");
            return seq.values[seq.values.length - 1];
        },
        params: ['list'],
        doc: `Get the last element of a list.

Usage: LAST(list)

Arguments:
  list - A list/sequence or list accessor variable

Examples:
  LAST([10, 20, 30])  → 30`
    }
}
