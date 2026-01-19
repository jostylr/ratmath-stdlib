
import { Rational, Integer } from "@ratmath/core";

export const Logic = {
    EQ: {
        handler: function (a, b) {
            if (a.equals && b.equals) return new Integer(a.equals(b) ? 1 : 0);
            return new Integer(a === b ? 1 : 0);
        },
        params: ['a', 'b'],
        doc: "Equality check (returns 1 if equal, 0 otherwise)"
    },
    NEQ: {
        handler: function (a, b) {
            if (a.equals && b.equals) return new Integer(!a.equals(b) ? 1 : 0);
            return new Integer(a !== b ? 1 : 0);
        },
        params: ['a', 'b'],
        doc: "Inequality check"
    },
    GT: {
        handler: function (a, b) {
            // Assume Rational/Integer has compare/subtract?
            // Rational has subtract. result sign.
            // If objects specific:
            if (a.subtract && b.subtract) {
                const diff = a.subtract(b); // a - b
                return new Integer(diff.sign() > 0 ? 1 : 0);
            }
            return new Integer(a > b ? 1 : 0);
        },
        params: ['a', 'b'],
        doc: "Greater Than"
    },
    LT: {
        handler: function (a, b) {
            if (a.subtract && b.subtract) {
                const diff = a.subtract(b);
                return new Integer(diff.sign() < 0 ? 1 : 0);
            }
            return new Integer(a < b ? 1 : 0);
        },
        params: ['a', 'b'],
        doc: "Less Than"
    },
    GTE: {
        handler: function (a, b) {
            if (a.subtract && b.subtract) {
                const diff = a.subtract(b);
                return new Integer(diff.sign() >= 0 ? 1 : 0);
            }
            return new Integer(a >= b ? 1 : 0);
        },
        params: ['a', 'b'],
        doc: "Greater Than or Equal"
    },
    LTE: {
        handler: function (a, b) {
            if (a.subtract && b.subtract) {
                const diff = a.subtract(b);
                return new Integer(diff.sign() <= 0 ? 1 : 0);
            }
            return new Integer(a <= b ? 1 : 0);
        },
        params: ['a', 'b'],
        doc: "Less Than or Equal"
    },

    /**
     * Logical AND with unlimited arguments
     * Returns 1 if all arguments are truthy (non-zero), 0 otherwise
     * Short-circuits: stops at first falsy value
     */
    AND: {
        type: 'js',
        handler: function () {
            const allArgs = this._currentCallScope?.get("@@");
            if (!allArgs || allArgs.type !== 'sequence' || allArgs.values.length === 0) {
                return new Integer(1n); // AND() with no args is true
            }
            
            for (const arg of allArgs.values) {
                const isTruthy = isTruthyValue(arg);
                if (!isTruthy) {
                    return new Integer(0n); // Short-circuit on first false
                }
            }
            return new Integer(1n);
        },
        params: ['a', 'b', '...'],
        doc: "Logical AND: returns 1 if all args are truthy, 0 otherwise (short-circuits)"
    },

    /**
     * Logical OR with unlimited arguments
     * Returns 1 if any argument is truthy (non-zero), 0 otherwise
     * Short-circuits: stops at first truthy value
     */
    OR: {
        type: 'js',
        handler: function () {
            const allArgs = this._currentCallScope?.get("@@");
            if (!allArgs || allArgs.type !== 'sequence' || allArgs.values.length === 0) {
                return new Integer(0n); // OR() with no args is false
            }
            
            for (const arg of allArgs.values) {
                const isTruthy = isTruthyValue(arg);
                if (isTruthy) {
                    return new Integer(1n); // Short-circuit on first true
                }
            }
            return new Integer(0n);
        },
        params: ['a', 'b', '...'],
        doc: "Logical OR: returns 1 if any arg is truthy, 0 otherwise (short-circuits)"
    },

    /**
     * Logical NOT
     * Returns 1 if argument is falsy (zero), 0 otherwise
     */
    NOT: {
        handler: function (a) {
            return new Integer(isTruthyValue(a) ? 0n : 1n);
        },
        params: ['a'],
        doc: "Logical NOT: returns 1 if arg is falsy, 0 otherwise"
    }
}

/**
 * Helper to check if a value is truthy (non-zero)
 */
function isTruthyValue(val) {
    if (val instanceof Integer) {
        return val.value !== 0n;
    } else if (val instanceof Rational) {
        return val.numerator !== 0n;
    } else if (typeof val === 'number') {
        return val !== 0;
    } else if (typeof val === 'bigint') {
        return val !== 0n;
    } else if (val?.value !== undefined) {
        return val.value !== 0n && val.value !== 0;
    }
    return Boolean(val);
}
