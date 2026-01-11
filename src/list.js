
import { Rational, Integer } from "@ratmath/core";

export const List = {
    LEN: {
        handler: function (list) {
            if (list && list.type === 'sequence') {
                return new Integer(list.values.length);
            }
            throw new Error("LEN expects a List");
        },
        params: ['list'],
        doc: "Length of a list"
    },

    GET: {
        handler: function (list, index) {
            if (!list || list.type !== 'sequence') throw new Error("GET expects a List");

            // Assume index is Integer/Rational
            let idx = Number(index.toString()); // Simple conversion

            if (idx === 0) return list; // 0 returns list itself per spec? Or just Accessor spec? 
            // Generic GET usually implies element access. 
            // Let's support 0 = list if requested, but typically 0 is not an element index in 1-based.
            // If 1-based:
            if (idx > 0) idx = idx - 1;
            if (idx < 0) idx = list.values.length + idx;

            if (idx < 0 || idx >= list.values.length) throw new Error(`Index ${index} out of bounds`);

            return list.values[idx];
        },
        params: ['list', 'index'],
        doc: "Get element at index (1-based)"
    },

    RANGE: {
        handler: function (start, end, step) {
            // Assuming start/end/step are numeric
            // Basic implementation for Integers
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
        doc: "Generate range of integers"
    },

    MAP: {
        handler: function (list, funcName) {
            if (!list || list.type !== 'sequence') throw new Error("MAP expects a List");
            const result = [];
            const chain = this._currentScopeChain;

            for (const item of list.values) {
                const itemStr = this.formatValueWithPrefix(item);
                const expr = `${funcName}(${itemStr})`;
                const r = this.evaluateExpression(expr, chain);
                if (r.type === 'error') throw new Error(`MAP Error: ${r.message}`);
                result.push(r.result);
            }
            return { type: 'sequence', values: result, lastValue: result[result.length - 1] };
        },
        params: ['list', 'func'],
        doc: "Apply function to each element"
    },

    FILTER: {
        handler: function (list, funcName) {
            if (!list || list.type !== 'sequence') throw new Error("FILTER expects a List");
            const result = [];
            const chain = this._currentScopeChain;

            for (const item of list.values) {
                const itemStr = this.formatValueWithPrefix(item);
                const expr = `${funcName}(${itemStr})`;
                const r = this.evaluateExpression(expr, chain);
                if (r.type === 'error') throw new Error(`FILTER Error: ${r.message}`);

                // Check truthiness
                const val = r.result;
                let isTrue = false;
                if (val && val.sign) isTrue = val.sign() !== 0;
                else if (typeof val === 'number') isTrue = val !== 0;

                if (isTrue) result.push(item);
            }
            return { type: 'sequence', values: result, lastValue: result.length > 0 ? result[result.length - 1] : new Integer(0) };
        },
        params: ['list', 'func'],
        doc: "Filter elements by predicate"
    },

    REDUCE: {
        handler: function (list, funcName, initial) {
            if (!list || list.type !== 'sequence') throw new Error("REDUCE expects a List");
            let accumulator = initial;
            const chain = this._currentScopeChain;

            for (const item of list.values) {
                const accStr = this.formatValueWithPrefix(accumulator);
                const itemStr = this.formatValueWithPrefix(item);
                const expr = `${funcName}(${accStr}, ${itemStr})`;
                const r = this.evaluateExpression(expr, chain);
                if (r.type === 'error') throw new Error(`REDUCE Error: ${r.message}`);
                accumulator = r.result;
            }
            return accumulator;
        },
        params: ['list', 'func', 'initial'],
        doc: "Reduce list to single value"
    },

    SOME: {
        handler: function (list, funcName) {
            if (!list || list.type !== 'sequence') throw new Error("SOME expects a List");
            const chain = this._currentScopeChain;
            for (const item of list.values) {
                const itemStr = this.formatValueWithPrefix(item);
                const expr = `${funcName}(${itemStr})`;
                const r = this.evaluateExpression(expr, chain);
                if (r.type === 'error') throw new Error(r.message);

                const val = r.result;
                let isTrue = false;
                if (val && val.sign) isTrue = val.sign() !== 0; // Rational/Integer
                if (isTrue) return new Integer(1);
            }
            return new Integer(0);
        },
        params: ['list', 'func'],
        doc: "Check if any element satisfies predicate"
    },

    ALL: {
        handler: function (list, funcName) {
            if (!list || list.type !== 'sequence') throw new Error("ALL expects a List");
            const chain = this._currentScopeChain;
            for (const item of list.values) {
                const itemStr = this.formatValueWithPrefix(item);
                const expr = `${funcName}(${itemStr})`;
                const r = this.evaluateExpression(expr, chain);
                if (r.type === 'error') throw new Error(r.message);

                const val = r.result;
                let isTrue = false;
                if (val && val.sign) isTrue = val.sign() !== 0;
                if (!isTrue) return new Integer(0);
            }
            return new Integer(1);
        },
        params: ['list', 'func'],
        doc: "Check if all elements satisfy predicate"
    }
}
