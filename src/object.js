
import { Integer } from "@ratmath/core";

/**
 * Object/Property decoration functions for RatMath
 * Allows attaching metadata and properties to variables and functions
 */

/**
 * Helper to extract string value from various input types
 */
function extractString(val) {
    if (val?.type === 'string') return val.value;
    if (typeof val === 'string') {
        return val.replace(/^"|"$/g, '');
    }
    return val?.toString() ?? '';
}

/**
 * Helper to extract variable/function name from identifier
 */
function extractName(val) {
    // Handle string objects { type: 'string', value: 'P' }
    if (val?.type === 'string') {
        let name = val.value;
        if (name.startsWith('@') && !name.startsWith('@@')) {
            name = name.substring(1);
        }
        return name;
    }
    if (typeof val === 'string') {
        // Remove quotes if present
        let name = val.replace(/^"|"$/g, '');
        // Normalize @ prefix
        if (name.startsWith('@') && !name.startsWith('@@')) {
            name = name.substring(1);
        }
        return name;
    }
    return val?.toString() ?? '';
}

/**
 * Helper to wrap a value as a string object if it's a raw string
 */
function wrapString(val) {
    if (typeof val === 'string') {
        return { type: 'string', value: val };
    }
    return val;
}

export const ObjectFunctions = {
    /**
     * Get property value: Get(P, "type") or Get(P, "type", defaultValue)
     */
    Get: {
        type: 'js',
        handler: function (target, propName, defaultValue) {
            const name = extractName(target);
            const prop = extractString(propName);
            
            const value = this.getDecoration(name, prop);
            if (value === undefined) {
                return defaultValue !== undefined ? wrapString(defaultValue) : undefined;
            }
            return wrapString(value);
        },
        params: ['target', 'property', 'default?'],
        doc: 'Get a property value from a variable or function. Get(P, "type") returns P.type value.'
    },

    /**
     * Set property value: Set(P, "type", "poly") or Set(P, {a=5, b=c}) or Set(P, "a", 1, "b", 2, ...)
     * Supports object literals and unlimited property/value pairs
     */
    Set: {
        type: 'js',
        handler: function (target) {
            const name = extractName(target);
            
            // Get all arguments via @@ sequence
            const allArgs = this._currentCallScope?.get("@@");
            if (!allArgs || allArgs.type !== 'sequence' || allArgs.values.length < 2) {
                throw new Error("Set requires at least target and property/value");
            }
            
            const args = allArgs.values;
            
            // Check if second arg is an object literal
            if (args.length === 2 && args[1]?.type === 'object') {
                const obj = args[1];
                let count = 0n;
                for (const [key, value] of obj.properties) {
                    const storedValue = wrapString(value);
                    this.setDecoration(name, key, storedValue);
                    count++;
                }
                return new Integer(count);
            }
            
            // Otherwise expect property/value pairs
            if (args.length < 3) {
                throw new Error("Set requires at least target, property, and value");
            }
            if ((args.length - 1) % 2 !== 0) {
                throw new Error("Set requires property/value pairs after target");
            }
            
            let count = 0n;
            for (let i = 1; i < args.length; i += 2) {
                const prop = extractString(args[i]);
                const val = wrapString(args[i + 1]);
                this.setDecoration(name, prop, val);
                count++;
            }
            
            return new Integer(count);
        },
        params: ['target', 'propsOrKey', 'value?'],
        doc: 'Set properties. Set(P, "a", 1) or Set(P, {a=1, b=2}) or Set(P, "a", 1, "b", 2, ...).'
    },

    /**
     * Check if property exists: Has(P, "type")
     */
    Has: {
        type: 'js',
        handler: function (target, propName) {
            const name = extractName(target);
            const prop = extractString(propName);
            
            return this.hasDecoration(name, prop) ? new Integer(1n) : new Integer(0n);
        },
        params: ['target', 'property'],
        doc: 'Check if a property exists on a variable or function. Returns 1 if exists, 0 otherwise.'
    },

    /**
     * Delete property: Del(P, "type")
     */
    Del: {
        type: 'js',
        handler: function (target, propName) {
            const name = extractName(target);
            const prop = extractString(propName);
            
            return this.deleteDecoration(name, prop) ? new Integer(1n) : new Integer(0n);
        },
        params: ['target', 'property'],
        doc: 'Delete a property from a variable or function. Returns 1 if deleted, 0 if not found.'
    },

    /**
     * Get/check type: Type(P) returns type, Type(P, "poly") checks if type matches
     */
    Type: {
        type: 'js',
        handler: function (target, checkType) {
            const name = extractName(target);
            
            const currentType = this.getDecoration(name, 'type');
            
            if (checkType !== undefined) {
                // Type check mode: return 1 if matches, 0 otherwise
                const typeToCheck = extractString(checkType);
                if (currentType === undefined) {
                    return new Integer(0n);
                }
                const currentTypeStr = extractString(currentType);
                return currentTypeStr === typeToCheck ? new Integer(1n) : new Integer(0n);
            }
            
            // Get mode: return the type value (wrapped as string object if needed)
            return wrapString(currentType);
        },
        params: ['target', 'checkType?'],
        doc: 'Get or check type. Type(P) returns type, Type(P, "poly") returns 1 if P.type == "poly".'
    },

    /**
     * List all properties: Props(P)
     */
    Props: {
        type: 'js',
        handler: function (target) {
            const name = extractName(target);
            
            const keys = this.getDecorationKeys(name);
            if (keys.length === 0) {
                return { type: 'sequence', values: [], lastValue: undefined };
            }
            
            const values = keys.map(k => ({ type: 'string', value: k }));
            return { type: 'sequence', values: values, lastValue: values[values.length - 1] };
        },
        params: ['target'],
        doc: 'Get all property names for a variable or function as a list.'
    },

    /**
     * Copy all properties from one target to another: CopyProps(source, dest)
     */
    CopyProps: {
        type: 'js',
        handler: function (source, dest) {
            const srcName = extractName(source);
            const destName = extractName(dest);
            
            const srcProps = this.getDecorations(srcName);
            if (!srcProps) {
                return new Integer(0n);
            }
            
            let count = 0n;
            for (const [key, value] of srcProps) {
                this.setDecoration(destName, key, value);
                count++;
            }
            
            return new Integer(count);
        },
        params: ['source', 'dest'],
        doc: 'Copy all properties from source to dest. Returns number of properties copied.'
    },

    /**
     * Clear all properties: ClearProps(P)
     */
    ClearProps: {
        type: 'js',
        handler: function (target) {
            const name = extractName(target);
            
            const props = this.getDecorations(name);
            if (!props) {
                return new Integer(0n);
            }
            
            const count = BigInt(props.size);
            this.decorations.delete(name);
            return new Integer(count);
        },
        params: ['target'],
        doc: 'Clear all properties from a variable or function. Returns number cleared.'
    },

    /**
     * Display info about a variable/function: Info(P) or Info(P, filter)
     * Takes variable name directly (not as string), returns multi-line string
     * Filter can be a string (match key substring)
     */
    Info: {
        type: 'js',
        lazy: true,  // Don't evaluate arguments - we want the name
        handler: function (target, filter) {
            // target comes in as unevaluated - extract the name
            let normalizedName;
            if (typeof target === 'string') {
                // It's a raw name from lazy evaluation
                normalizedName = this.normalizeName(target.replace(/^@/, ''));
            } else if (target?.type === 'string') {
                normalizedName = this.normalizeName(target.value);
            } else {
                normalizedName = extractName(target);
            }
            
            const lines = [];
            
            // Helper to format a function definition nicely
            const formatFuncDef = (funcName) => {
                if (!this.functions.has(funcName)) return funcName;
                const funcDef = this.functions.get(funcName);
                if (funcDef.params && funcDef.body) {
                    let body = funcDef.body.replace(/@([a-zA-Z])/g, '$1').replace(/0d(\d+)/g, '$1').trim();
                    return `(${funcDef.params.join(", ")}) -> ${body}`;
                }
                return '[func]';
            };
            
            // Helper to format value, with indent for nested structures
            const formatValue = (val, indent = "") => {
                if (val === undefined || val === null) return "undefined";
                if (val.type === 'string') {
                    // Check if it's an anonymous lambda reference - show its definition
                    if (val.value.startsWith('@@Anon@') && this.functions.has(val.value)) {
                        return formatFuncDef(val.value);
                    }
                    // Check if it's any function reference
                    if (this.functions.has(val.value)) {
                        return formatFuncDef(val.value);
                    }
                    return val.value;
                }
                if (val.type === 'sequence') {
                    // Show list items
                    const items = val.values.map(v => {
                        if (v?.value !== undefined) return v.value.toString();
                        if (v?.type === 'string') return v.value;
                        return v?.toString() || 'undefined';
                    });
                    return `[${items.join(", ")}]`;
                }
                if (val.type === 'object' && val.properties) {
                    // Show object properties inline or nested
                    const propStrs = [];
                    for (const [k, v] of val.properties) {
                        const vStr = v?.value !== undefined ? v.value.toString() : (v?.toString() || 'undefined');
                        propStrs.push(`${k}=${vStr}`);
                    }
                    return `{${propStrs.join(", ")}}`;
                }
                if (typeof val === 'string') {
                    // Check if it's an anonymous lambda - show its definition
                    if (val.startsWith('@@Anon@') && this.functions.has(val)) {
                        return formatFuncDef(val);
                    }
                    if (this.functions.has(val)) return formatFuncDef(val);
                    return val;
                }
                if (val.value !== undefined) return val.value.toString();
                return val.toString();
            };
            
            // Helper to add nested lines for objects/lists
            const addNestedLines = (val, baseIndent) => {
                if (val.type === 'sequence' && val.values) {
                    val.values.forEach((item, idx) => {
                        const itemStr = item?.value !== undefined ? item.value.toString() : 
                                       (item?.type === 'string' ? item.value : item?.toString() || 'undefined');
                        lines.push(`${baseIndent}  [${idx + 1}] ${itemStr}`);
                    });
                }
                if (val.type === 'object' && val.properties) {
                    for (const [k, v] of val.properties) {
                        const vStr = v?.value !== undefined ? v.value.toString() : (v?.toString() || 'undefined');
                        lines.push(`${baseIndent}  ${k} = ${vStr}`);
                    }
                }
            };
            
            // First line: definition/value
            let firstLine = normalizedName;
            let isObjectVar = false;
            let objectVar = null;
            
            if (this.functions.has(normalizedName)) {
                const funcDef = this.functions.get(normalizedName);
                if (funcDef.type === 'object_function') {
                    const displayProp = this.getDecoration(normalizedName, "_display");
                    firstLine = displayProp?.type === 'string' ? displayProp.value : `${normalizedName} {object}`;
                } else if (funcDef.type === 'list_accessor') {
                    firstLine = `${normalizedName} [list]`;
                } else if (funcDef.params && funcDef.body) {
                    let body = funcDef.body.replace(/@([a-zA-Z])/g, '$1').replace(/0d(\d+)/g, '$1').trim();
                    firstLine = `${normalizedName}(${funcDef.params.join(", ")}) -> ${body}`;
                } else if (funcDef.type === 'js') {
                    firstLine = `${normalizedName} [builtin]`;
                }
            } else if (this.variables.has(normalizedName)) {
                const varVal = this.variables.get(normalizedName);
                if (varVal && varVal.type === 'object') {
                    // Object variable - show {Object} on first line
                    firstLine = `{Object}`;
                    isObjectVar = true;
                    objectVar = varVal;
                } else {
                    firstLine = `${normalizedName} = ${formatValue(varVal)}`;
                }
            } else {
                firstLine = `${normalizedName} [not found]`;
            }
            lines.push(firstLine);
            
            // For object variables, show internal properties first
            if (isObjectVar && objectVar && objectVar.properties) {
                for (const [key, value] of objectVar.properties) {
                    if (filter !== undefined && filter !== null) {
                        let filterStr = filter;
                        if (typeof filter === 'string') {
                            filterStr = filter.replace(/^["']|["']$/g, '');
                        } else if (filter?.type === 'string') {
                            filterStr = filter.value;
                        }
                        if (filterStr && !key.includes(filterStr)) continue;
                    }
                    lines.push(`  ${key} = ${formatValue(value)}`);
                }
            }
            
            // Properties (decorations)
            const props = this.getDecorations(normalizedName);
            if (props && props.size > 0) {
                for (const [key, value] of props) {
                    if (filter !== undefined && filter !== null) {
                        let filterStr = filter;
                        if (typeof filter === 'string') {
                            filterStr = filter.replace(/^["']|["']$/g, '');
                        } else if (filter?.type === 'string') {
                            filterStr = filter.value;
                        }
                        if (filterStr && !key.includes(filterStr)) continue;
                    }
                    lines.push(`  ${key} = ${formatValue(value)}`);
                    // Add nested details for objects and lists
                    if (value?.type === 'object' || value?.type === 'sequence') {
                        addNestedLines(value, "  ");
                    }
                }
            }
            
            return { type: 'string', value: lines.join('\n') };
        },
        params: ['target', 'filter?'],
        doc: 'Display info: Info(P) shows definition and properties.'
    }
};
