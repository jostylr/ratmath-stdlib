
import { Core } from "./core.js";
import { Logic } from "./logic.js";
import { List } from "./list.js";
import { StringFunctions } from "./string.js";
import { ObjectFunctions } from "./object.js";

export * from "./core.js";
export * from "./logic.js";
export * from "./list.js";
export * from "./string.js";
export * from "./object.js";

/**
 * Registers all Standard Library functions into the provided VariableManager.
 * @param {VariableManager} vm - The VariableManager instance.
 */
export function registerStdLib(vm) {
    // Helper to register with normalized name
    const register = (name, def) => {
        const normalizedName = vm.normalizeName(name);
        vm.functions.set(normalizedName, def);
    };

    // Core Functions
    for (const [name, def] of Object.entries(Core)) {
        register(name, def);
    }

    // Logic Functions
    for (const [name, def] of Object.entries(Logic)) {
        register(name, def);
    }

    // List Functions
    for (const [name, def] of Object.entries(List)) {
        register(name, def);
    }

    // String Functions
    for (const [name, def] of Object.entries(StringFunctions)) {
        register(name, def);
    }

    // Object/Property Functions
    for (const [name, def] of Object.entries(ObjectFunctions)) {
        register(name, def);
    }

    return "Standard Library Loaded";
}
