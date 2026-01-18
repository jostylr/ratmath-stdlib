
import { Core } from "./core.js";
import { Logic } from "./logic.js";
import { List } from "./list.js";
import { StringFunctions } from "./string.js";

export * from "./core.js";
export * from "./logic.js";
export * from "./list.js";
export * from "./string.js";

/**
 * Registers all Standard Library functions into the provided VariableManager.
 * @param {VariableManager} vm - The VariableManager instance.
 */
export function registerStdLib(vm) {
    // Core Functions
    for (const [name, def] of Object.entries(Core)) {
        vm.functions.set(name, def);
    }

    // Logic Functions
    for (const [name, def] of Object.entries(Logic)) {
        vm.functions.set(name, def);
    }

    // List Functions
    for (const [name, def] of Object.entries(List)) {
        vm.functions.set(name, def);
    }

    // String Functions
    for (const [name, def] of Object.entries(StringFunctions)) {
        vm.functions.set(name, def);
    }

    return "Standard Library Loaded";
}
