
import { Rational, Integer } from "@ratmath/core";

export const Core = {
    GETVAR: {
        handler: function (nameStr, level = 0) {
            let name = nameStr.toString().trim();
            if (name.startsWith('"') && name.endsWith('"')) {
                name = name.slice(1, -1);
            }
            // level might be BigInt/Integer from eval
            const lvl = Number(level.toString());

            const chain = this._currentScopeChain || [new Map()];

            if (lvl === -1) {
                return this.variables.get(name);
            }

            if (lvl >= 0 && lvl < chain.length) {
                const scope = chain[lvl];
                if (scope && scope.has(name)) return scope.get(name);
            }

            return undefined;
        },
        params: ['name', 'level?'],
        doc: "Get variable value from specific scope level (0=current, 1=parent, -1=global)"
    },

    ASSIGN: {
        lazy: true,
        handler: function (nameStr, valStr) {
            let name = nameStr.trim();
            if (name.startsWith('"') && name.endsWith('"')) {
                name = name.slice(1, -1);
            }

            const chain = this._currentScopeChain;
            const valRes = this.evaluateExpression(valStr, chain);
            if (valRes.type === 'error') throw new Error(valRes.message);

            if (!chain || chain.length === 0) {
                this.variables.set(name, valRes.result);
            } else {
                chain[0].set(name, valRes.result);
            }
            return valRes.result;
        },
        params: ['name', 'value'],
        doc: "Assign variable in local scope"
    },

    GLOBAL: {
        lazy: true,
        handler: function (nameStr, valStr) {
            let name = nameStr.trim();
            if (name.startsWith('"') && name.endsWith('"')) {
                name = name.slice(1, -1);
            }

            const chain = this._currentScopeChain;
            const valRes = this.evaluateExpression(valStr, chain);
            if (valRes.type === 'error') throw new Error(valRes.message);
            this.variables.set(name, valRes.result);
            return valRes.result;
        },
        params: ['name', 'value'],
        doc: "Assign variable in global scope"
    },

    IF: {
        lazy: true,
        handler: function (condStr, trueStr, falseStr) {
            const chain = this._currentScopeChain;
            const condRes = this.evaluateExpression(condStr, chain);
            if (condRes.type === 'error') throw new Error(condRes.message);

            const val = condRes.result;
            let isTrue = false;

            // Determine Truthiness (Non-zero)
            if (val instanceof Integer || val instanceof Rational) {
                isTrue = val.sign() !== 0; // Assuming sign() returns 0 for zero
            } else if (typeof val === 'number') {
                isTrue = val !== 0;
            } else if (typeof val === 'bigint') {
                isTrue = val !== 0n;
            }
            // Intervals? Sequence? Assuming False for unknown or check logic?
            // For now simple numeric check.

            if (isTrue) {
                const r = this.evaluateExpression(trueStr, chain);
                if (r.type === 'error') throw new Error(r.message);
                return r.result;
            } else {
                if (falseStr === undefined) return new Integer(0); // Default False value?
                const r = this.evaluateExpression(falseStr, chain);
                if (r.type === 'error') throw new Error(r.message);
                return r.result;
            }
        },
        params: ['cond', 'trueExp', 'falseExp?'],
        doc: "Conditional evaluation"
    },

    MULTI: {
        lazy: true,
        handler: function (...args) {
            const chain = this._currentScopeChain;
            let lastResult = new Integer(0);
            for (const expr of args) {
                const r = this.evaluateExpression(expr, chain);
                if (r.type === 'error') throw new Error(r.message);
                lastResult = r.result;
            }
            return lastResult;
        },
        params: ['...expressions'],
        doc: "Execute multiple expressions, return result of last one"
    }
};
