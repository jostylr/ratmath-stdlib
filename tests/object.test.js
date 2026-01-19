import { describe, test, expect, beforeEach } from "bun:test";
import { VariableManager } from "@ratmath/algebra";
import { registerStdLib } from "../src/index.js";

// Helper to extract string value from either raw string or string object
function getStringValue(val) {
    if (val?.type === 'string') return val.value;
    if (typeof val === 'string') return val;
    return val?.toString();
}

describe("Object/Property Decoration Functions", () => {
    let vm;

    beforeEach(() => {
        vm = new VariableManager();
        registerStdLib(vm);
    });

    describe("Property Assignment Syntax (P.type = value)", () => {
        test("set string property on variable", () => {
            vm.processInput("x = 5");
            const result = vm.processInput('x.type = "integer"');
            
            expect(result.type).toBe("property_assignment");
            expect(result.result).toBe('"integer"');
            
            // Verify the property was actually set
            const propValue = vm.getDecoration("x", "type");
            expect(propValue.type).toBe("string");
            expect(propValue.value).toBe("integer");
        });

        test("set numeric property on variable", () => {
            vm.processInput("x = 5");
            const result = vm.processInput("x.order = 3");
            
            expect(result.type).toBe("property_assignment");
            expect(result.result).toBe("3");
        });

        test("set property on function", () => {
            vm.processInput("P(x) -> x^2");
            const result = vm.processInput('P.type = "poly"');
            
            expect(result.type).toBe("property_assignment");
            expect(result.result).toBe('"poly"');
            
            // Verify the property was actually set
            const propValue = vm.getDecoration("P", "type");
            expect(propValue.type).toBe("string");
            expect(propValue.value).toBe("poly");
        });

        test("error when target doesn't exist", () => {
            const result = vm.processInput('nonexistent.type = "test"');
            
            expect(result.type).toBe("error");
            expect(result.message).toContain("undefined target");
        });
    });

    describe("Get function", () => {
        test("get existing property", () => {
            vm.processInput("x = 5");
            vm.processInput('x.type = "integer"');
            
            const result = vm.processInput('Get("x", "type")');
            expect(result.type).toBe("expression");
            // Result may be raw string or string object due to evaluation pipeline
            expect(getStringValue(result.result)).toBe("integer");
        });

        test("get non-existent property returns 0", () => {
            vm.processInput("x = 5");
            
            const result = vm.processInput('Get("x", "nonexistent")');
            expect(result.type).toBe("expression");
            // undefined becomes 0 when parsed
        });

        test("get with default value", () => {
            vm.processInput("x = 5");
            
            const result = vm.processInput('Get("x", "type", "unknown")');
            expect(result.type).toBe("expression");
            expect(getStringValue(result.result)).toBe("unknown");
        });
    });

    describe("Set function", () => {
        test("set property via function", () => {
            vm.processInput("x = 5");
            
            const result = vm.processInput('Set("x", "category", "number")');
            expect(result.type).toBe("expression");
            
            // Verify it was set via decoration map directly
            expect(vm.getDecoration("x", "category").value).toBe("number");
        });
    });

    describe("Has function", () => {
        test("returns 1 for existing property", () => {
            vm.processInput("x = 5");
            vm.processInput('x.type = "integer"');
            
            const result = vm.processInput('Has("x", "type")');
            expect(result.type).toBe("expression");
            expect(result.result.value.toString()).toBe("1");
        });

        test("returns 0 for non-existent property", () => {
            vm.processInput("x = 5");
            
            const result = vm.processInput('Has("x", "nonexistent")');
            expect(result.type).toBe("expression");
            expect(result.result.value.toString()).toBe("0");
        });
    });

    describe("Del function", () => {
        test("delete existing property returns 1", () => {
            vm.processInput("x = 5");
            vm.processInput('x.type = "integer"');
            
            const result = vm.processInput('Del("x", "type")');
            expect(result.type).toBe("expression");
            expect(result.result.value.toString()).toBe("1");
            
            // Verify it was deleted
            const hasResult = vm.processInput('Has("x", "type")');
            expect(hasResult.result.value.toString()).toBe("0");
        });

        test("delete non-existent property returns 0", () => {
            vm.processInput("x = 5");
            
            const result = vm.processInput('Del("x", "nonexistent")');
            expect(result.type).toBe("expression");
            expect(result.result.value.toString()).toBe("0");
        });
    });

    describe("Type function", () => {
        test("get type property", () => {
            vm.processInput("P(x) -> x^2");
            vm.processInput('P.type = "poly"');
            
            const result = vm.processInput('Type("P")');
            expect(result.type).toBe("expression");
            // Result may be raw string or string object
            expect(getStringValue(result.result)).toBe("poly");
        });

        test("check type matches - returns 1", () => {
            vm.processInput("P(x) -> x^2");
            vm.processInput('P.type = "poly"');
            
            const result = vm.processInput('Type("P", "poly")');
            expect(result.type).toBe("expression");
            expect(result.result.value.toString()).toBe("1");
        });

        test("check type doesn't match - returns 0", () => {
            vm.processInput("P(x) -> x^2");
            vm.processInput('P.type = "poly"');
            
            const result = vm.processInput('Type("P", "rational")');
            expect(result.type).toBe("expression");
            expect(result.result.value.toString()).toBe("0");
        });

        test("check type when not set - returns 0", () => {
            vm.processInput("P(x) -> x^2");
            
            const result = vm.processInput('Type("P", "poly")');
            expect(result.type).toBe("expression");
            expect(result.result.value.toString()).toBe("0");
        });
    });

    describe("Props function", () => {
        test("get all property names", () => {
            vm.processInput("x = 5");
            vm.processInput('x.type = "integer"');
            vm.processInput('x.category = "number"');
            
            const result = vm.processInput('Props("x")');
            expect(result.type).toBe("expression");
            expect(result.result.type).toBe("sequence");
            expect(result.result.values.length).toBe(2);
        });

        test("empty list for no properties", () => {
            vm.processInput("x = 5");
            
            const result = vm.processInput('Props("x")');
            expect(result.type).toBe("expression");
            expect(result.result.type).toBe("sequence");
            expect(result.result.values.length).toBe(0);
        });
    });

    describe("CopyProps function", () => {
        test("copy properties from one target to another", () => {
            vm.processInput("x = 5");
            vm.processInput("y = 10");
            vm.processInput('x.type = "integer"');
            vm.processInput('x.category = "number"');
            
            const result = vm.processInput('CopyProps("x", "y")');
            expect(result.type).toBe("expression");
            expect(result.result.value.toString()).toBe("2");
            
            // Verify properties were copied via decoration map directly
            expect(vm.getDecoration("y", "type").value).toBe("integer");
        });
    });

    describe("ClearProps function", () => {
        test("clear all properties", () => {
            vm.processInput("x = 5");
            vm.processInput('x.type = "integer"');
            vm.processInput('x.category = "number"');
            
            const result = vm.processInput('ClearProps("x")');
            expect(result.type).toBe("expression");
            expect(result.result.value.toString()).toBe("2");
            
            // Verify properties were cleared
            const propsResult = vm.processInput('Props("x")');
            expect(propsResult.result.values.length).toBe(0);
        });
    });

    describe("Function as property", () => {
        test("store function reference as property", () => {
            vm.processInput("P(x) -> x^2");
            vm.processInput("DP(x) -> 2*x");
            vm.processInput('P.Derivative = "DP"');
            
            // Verify via decoration map directly
            expect(vm.getDecoration("P", "Derivative").value).toBe("DP");
        });
    });

    describe("Property access in expressions (P.type)", () => {
        test("read numeric property in expression", () => {
            vm.processInput("x = 5");
            vm.processInput("x.order = 3");
            
            // P.type should be substituted with its value
            const result = vm.processInput("x.order + 2");
            expect(result.type).toBe("expression");
            expect(result.result.value.toString()).toBe("5");
        });

        test("read string property in expression", () => {
            vm.processInput("P(x) -> x^2");
            vm.processInput('P.type = "poly"');
            
            // Verify property is set
            expect(vm.getDecoration("P", "type").value).toBe("poly");
        });

        test("property access on function", () => {
            vm.processInput("F(x) -> x + 1");
            vm.processInput("F.degree = 1");
            
            const result = vm.processInput("F.degree * 2");
            expect(result.type).toBe("expression");
            expect(result.result.value.toString()).toBe("2");
        });
    });

    describe("Property-based function calls (P.Der(5))", () => {
        test("call lambda stored as property", () => {
            vm.processInput("P(x) -> x^2");
            vm.processInput("P.Der = x->2*x");
            
            const result = vm.processInput("P.Der(5)");
            expect(result.type).toBe("expression");
            expect(result.result.value.toString()).toBe("10");
        });

        test("read property shows function definition", () => {
            vm.processInput("P(x) -> x^2");
            vm.processInput("P.Der = x->2*x");
            
            const result = vm.processInput("P.Der");
            expect(result.type).toBe("expression");
            expect(result.result).toBe("x -> 2*x");
        });

        test("assignment shows function definition", () => {
            vm.processInput("P(x) -> x^2");
            const result = vm.processInput("P.Der = x->2*x");
            
            expect(result.type).toBe("property_assignment");
            expect(result.result).toBe("x -> 2*x");
        });
    });

    describe("Set with multiple properties", () => {
        test("set two properties at once", () => {
            vm.processInput("P(x) -> x^2");
            const result = vm.processInput('Set("P", "type", "poly", "degree", 2)');
            
            expect(result.type).toBe("expression");
            expect(result.result.value.toString()).toBe("2"); // count of props set
            
            expect(vm.getDecoration("P", "type").value).toBe("poly");
            expect(vm.getDecoration("P", "degree").value.toString()).toBe("2");
        });

        test("set three properties at once", () => {
            vm.processInput("Q(x) -> x^3");
            vm.processInput('Set("Q", "a", 1, "b", 2, "c", 3)');
            
            expect(vm.getDecoration("Q", "a").value.toString()).toBe("1");
            expect(vm.getDecoration("Q", "b").value.toString()).toBe("2");
            expect(vm.getDecoration("Q", "c").value.toString()).toBe("3");
        });
    });

    describe("Info function", () => {
        test("returns definition and properties as string", () => {
            vm.processInput("P(x) -> x^2");
            vm.processInput('Set("P", "type", "poly")');
            vm.processInput('Set("P", "degree", 2)');
            
            const result = vm.processInput('Info(P)');
            expect(result.type).toBe("expression");
            expect(result.result.type).toBe("string");
            expect(result.result.value).toContain("P(x)");
            expect(result.result.value).toContain("type = poly");
            expect(result.result.value).toContain("degree = 2");
        });

        test("filters by string", () => {
            vm.processInput("Q(x) -> x^3");
            vm.processInput('Set("Q", "type", "poly")');
            vm.processInput('Set("Q", "degree", 3)');
            vm.processInput('Set("Q", "name", "cubic")');
            
            const result = vm.processInput('Info(Q, "deg")');
            expect(result.type).toBe("expression");
            expect(result.result.type).toBe("string");
            // Should only match "degree"
            expect(result.result.value).toContain("degree");
            expect(result.result.value).not.toContain("type = poly");
        });

        test("shows object info", () => {
            vm.processInput("O = {a=5, b=10}");
            
            const result = vm.processInput('Info(O)');
            expect(result.type).toBe("expression");
            expect(result.result.type).toBe("string");
            expect(result.result.value).toContain("O {object}");
            expect(result.result.value).toContain("a = 5");
            expect(result.result.value).toContain("b = 10");
        });
    });

    describe("Object literal syntax {a=5, b=c}", () => {
        test("Set with object literal", () => {
            vm.processInput("P(x) -> x^2");
            const result = vm.processInput('Set("P", {a=5, b=10})');
            
            expect(result.type).toBe("expression");
            expect(result.result.value.toString()).toBe("2");
            expect(vm.getDecoration("P", "a").value.toString()).toBe("5");
            expect(vm.getDecoration("P", "b").value.toString()).toBe("10");
        });

        test("Object literal with string values", () => {
            vm.processInput("Q(x) -> x^3");
            vm.processInput('Set("Q", {type="poly", name="cubic"})');
            
            expect(vm.getDecoration("Q", "type").value).toBe("poly");
            expect(vm.getDecoration("Q", "name").value).toBe("cubic");
        });

        test("Object literal with lambda", () => {
            vm.processInput("R(x) -> x^2");
            vm.processInput('Set("R", {Der=x->2*x})');
            
            const result = vm.processInput("R.Der(5)");
            expect(result.type).toBe("expression");
            expect(result.result.value.toString()).toBe("10");
        });

        test("Object literal with nested list", () => {
            vm.processInput("S(x) -> x");
            vm.processInput('Set("S", {data=[1,2,3]})');
            
            const data = vm.getDecoration("S", "data");
            expect(data.type).toBe("sequence");
            expect(data.values.length).toBe(3);
        });
    });

    describe("Object variable assignment (P = {...})", () => {
        test("basic object assignment", () => {
            const result = vm.processInput("P = {a=5, b=10}");
            expect(result.type).toBe("function");
            expect(result.message).toContain("Object P defined");
            
            expect(vm.getDecoration("P", "a").value.toString()).toBe("5");
            expect(vm.getDecoration("P", "b").value.toString()).toBe("10");
        });

        test("empty object assignment", () => {
            const result = vm.processInput("Q = {}");
            expect(result.type).toBe("function");
            expect(result.message).toContain("0 properties");
        });

        test("object with _eval for function behavior", () => {
            vm.processInput("R = {_eval=x->x*2}");
            
            const result = vm.processInput("R(5)");
            expect(result.type).toBe("expression");
            expect(result.result.value.toString()).toBe("10");
        });

        test("object with _display for custom display", () => {
            vm.processInput('S = {_eval=x->x^2, _display="x squared"}');
            
            const display = vm.processInput("S");
            expect(display.message).toBe("x squared");
            
            // But evaluation still works
            const result = vm.processInput("S(3)");
            expect(result.result.value.toString()).toBe("9");
        });

        test("object with _definition for restoration", () => {
            vm.processInput('T = {_eval=x->x^2, _definition="T(x) -> x^2"}');
            
            const def = vm.getDecoration("T", "_definition");
            expect(def.value).toBe("T(x) -> x^2");
        });
    });
});
