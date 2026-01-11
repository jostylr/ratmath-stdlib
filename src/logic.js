
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
    }
}
