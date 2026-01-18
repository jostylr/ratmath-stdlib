
import { Integer } from "@ratmath/core";

/**
 * String Functions for RatMath stdlib
 * 
 * Basic string manipulation functions.
 * Strings are passed as quoted literals: "text"
 */

export const StringFunctions = {
    STRLEN: {
        handler: function (str) {
            const s = extractString(str);
            return new Integer(BigInt(s.length));
        },
        params: ['string'],
        doc: "Returns the length of a string"
    },

    CONCAT: {
        handler: function (...args) {
            const parts = args.map(a => extractString(a));
            return { type: 'string', value: parts.join('') };
        },
        params: ['str1', 'str2', '...'],
        doc: "Concatenates multiple strings"
    },

    SUBSTR: {
        handler: function (str, start, length) {
            const s = extractString(str);
            const startIdx = Number(start.toString());
            const len = length !== undefined ? Number(length.toString()) : undefined;
            const result = len !== undefined ? s.substring(startIdx, startIdx + len) : s.substring(startIdx);
            return { type: 'string', value: result };
        },
        params: ['string', 'start', 'length?'],
        doc: "Extract substring starting at index (0-based), optional length"
    },

    INDEXOF: {
        handler: function (str, search) {
            const s = extractString(str);
            const searchStr = extractString(search);
            const idx = s.indexOf(searchStr);
            return new Integer(BigInt(idx));
        },
        params: ['string', 'search'],
        doc: "Find index of search string (-1 if not found)"
    },

    UPPER: {
        handler: function (str) {
            const s = extractString(str);
            return { type: 'string', value: s.toUpperCase() };
        },
        params: ['string'],
        doc: "Convert string to uppercase"
    },

    LOWER: {
        handler: function (str) {
            const s = extractString(str);
            return { type: 'string', value: s.toLowerCase() };
        },
        params: ['string'],
        doc: "Convert string to lowercase"
    },

    TRIM: {
        handler: function (str) {
            const s = extractString(str);
            return { type: 'string', value: s.trim() };
        },
        params: ['string'],
        doc: "Remove leading and trailing whitespace"
    },

    REPLACE: {
        handler: function (str, search, replacement) {
            const s = extractString(str);
            const searchStr = extractString(search);
            const replaceStr = extractString(replacement);
            return { type: 'string', value: s.split(searchStr).join(replaceStr) };
        },
        params: ['string', 'search', 'replacement'],
        doc: "Replace all occurrences of search with replacement"
    },

    SPLIT: {
        handler: function (str, delimiter) {
            const s = extractString(str);
            const delim = extractString(delimiter);
            const parts = s.split(delim);
            return {
                type: 'sequence',
                values: parts.map(p => ({ type: 'string', value: p }))
            };
        },
        params: ['string', 'delimiter'],
        doc: "Split string by delimiter, returns a list"
    },

    JOIN: {
        handler: function (list, delimiter) {
            if (!list || list.type !== 'sequence') {
                throw new Error("JOIN expects a list as first argument");
            }
            const delim = delimiter !== undefined ? extractString(delimiter) : "";
            const parts = list.values.map(v => extractString(v));
            return { type: 'string', value: parts.join(delim) };
        },
        params: ['list', 'delimiter?'],
        doc: "Join list elements into a string with optional delimiter"
    },

    TOSTR: {
        handler: function (value) {
            if (value && value.type === 'string') return value;
            const str = value.toString();
            return { type: 'string', value: str };
        },
        params: ['value'],
        doc: "Convert value to string"
    },

    STARTSWITH: {
        handler: function (str, prefix) {
            const s = extractString(str);
            const p = extractString(prefix);
            return new Integer(s.startsWith(p) ? 1n : 0n);
        },
        params: ['string', 'prefix'],
        doc: "Returns 1 if string starts with prefix, 0 otherwise"
    },

    ENDSWITH: {
        handler: function (str, suffix) {
            const s = extractString(str);
            const suf = extractString(suffix);
            return new Integer(s.endsWith(suf) ? 1n : 0n);
        },
        params: ['string', 'suffix'],
        doc: "Returns 1 if string ends with suffix, 0 otherwise"
    },

    CONTAINS: {
        handler: function (str, search) {
            const s = extractString(str);
            const searchStr = extractString(search);
            return new Integer(s.includes(searchStr) ? 1n : 0n);
        },
        params: ['string', 'search'],
        doc: "Returns 1 if string contains search, 0 otherwise"
    },

    REPEAT: {
        handler: function (str, count) {
            const s = extractString(str);
            const n = Number(count.toString());
            if (n < 0) throw new Error("REPEAT count must be non-negative");
            return { type: 'string', value: s.repeat(n) };
        },
        params: ['string', 'count'],
        doc: "Repeat string count times"
    },

    REVERSE: {
        handler: function (str) {
            const s = extractString(str);
            return { type: 'string', value: s.split('').reverse().join('') };
        },
        params: ['string'],
        doc: "Reverse a string"
    },

    CHARAT: {
        handler: function (str, index) {
            const s = extractString(str);
            const idx = Number(index.toString());
            if (idx < 0 || idx >= s.length) {
                throw new Error(`Index ${idx} out of bounds for string of length ${s.length}`);
            }
            return { type: 'string', value: s.charAt(idx) };
        },
        params: ['string', 'index'],
        doc: "Get character at index (0-based)"
    },

    CHARCODE: {
        handler: function (str, index) {
            const s = extractString(str);
            const idx = index !== undefined ? Number(index.toString()) : 0;
            if (idx < 0 || idx >= s.length) {
                throw new Error(`Index ${idx} out of bounds for string of length ${s.length}`);
            }
            return new Integer(BigInt(s.charCodeAt(idx)));
        },
        params: ['string', 'index?'],
        doc: "Get character code at index (default 0)"
    },

    FROMCHARCODE: {
        handler: function (...codes) {
            const chars = codes.map(c => String.fromCharCode(Number(c.toString())));
            return { type: 'string', value: chars.join('') };
        },
        params: ['code', '...'],
        doc: "Create string from character codes"
    }
};

/**
 * Helper to extract string value from various formats
 */
function extractString(val) {
    if (val === undefined || val === null) return "";
    if (val.type === 'string') return val.value;
    if (typeof val === 'string') {
        // Remove quotes if present
        if (val.startsWith('"') && val.endsWith('"')) {
            return val.slice(1, -1);
        }
        return val;
    }
    return val.toString();
}
