
import { describe, it, expect, beforeEach } from 'bun:test';
import { VariableManager } from '../../algebra/src/var.js';
// Directly import definition to avoid package resolution issues in test without build
import { Core } from '../src/core.js';
import { Logic } from '../src/logic.js';
import { List } from '../src/list.js';
import { Integer, Rational } from '../../core/index.js';

describe('StdLib Integration', () => {
    let vm;

    beforeEach(() => {
        vm = new VariableManager();
        // Mock loading modules manually since we are testing internal logic
        // or effectively "loading" them
        vm.loadModule("Core", { functions: Core });
        vm.loadModule("Logic", { functions: Logic });
        vm.loadModule("List", { functions: List });

        // Debug
        console.log("Registered functions:", Array.from(vm.functions.keys()));
        console.log("Core keys:", Object.keys(Core));
    });

    it('should support ASSIGN and GETVAR', () => {
        // ASSIGN(x, 10)
        const res = vm.processInput('ASSIGN("x", 10)');
        if (res.type === 'error') console.error("ASSIGN ERROR:", res.message);
        expect(res.type).toBe('expression');
        expect(vm.variables.get("x").toString()).toBe("10");

        // GETVAR("x", 0) -> 10
        const res2 = vm.processInput('GETVAR("x", 0)');
        if (res2.type === 'error') console.error("GETVAR ERROR:", res2.message);
        expect(res2.result.toString()).toBe("10");
    });

    it('should support GLOBAL assignment', () => {
        vm.processInput('GLOBAL("g", 99)');
        expect(vm.variables.get("g").toString()).toBe("99");
    });

    it('should support lazy IF', () => {
        // IF(1, 10, 1/0) -> Should return 10 and NOT error on 1/0
        const res = vm.processInput('IF(1, 10, 1/0)');
        expect(res.type).toBe('expression');
        expect(res.result.toString()).toBe("10");

        // IF(0, 1/0, 20) -> Should return 20
        const res2 = vm.processInput('IF(0, 1/0, 20)');
        if (res2.type === 'error') console.error("IF Error:", res2.message);
        else expect(res2.result.toString()).toBe("20");
    });

    it('should support Logic functions', () => {
        const res = vm.processInput('EQ(10, 10)');
        if (res.type === 'error') console.error("EQ ERROR:", res.message);
        expect(res.result.toString()).toBe("1");
        expect(vm.processInput('EQ(10, 20)').result.toString()).toBe("0");
        expect(vm.processInput('GT(5, 2)').result.toString()).toBe("1");
        expect(vm.processInput('LT(5, 2)').result.toString()).toBe("0");
    });

    it('should support List literals and LEN', () => {
        // L = [1, 2, 3]
        vm.processInput('L = [1, 2, 3]'); // Stores last value in L (3)
        // But we want to test LEN on a list.
        // We need to pass a sequence to LEN.
        // If L stores last value, LEN(L) sees scalar.
        // We must stick to passing Literal or Uppercase List Accessor?

        // Test 1: Literal
        const res = vm.processInput('LEN([1, 2, 3])');
        if (res.type === 'error') console.error("LEN ERROR:", res.message);
        expect(res.result.toString()).toBe("3");

        // Test 2: Uppercase List Accessor
        vm.processInput('LIST = [10, 20, 30]'); // LIST becomes accessor
        // Accessor(0) returns full list
        const res2 = vm.processInput('LEN(LIST(0))');
        expect(res2.result.toString()).toBe("3");
    });

    it('should support List Accessor elements', () => {
        vm.processInput('SEQ = [10, 20, 30]');
        expect(vm.processInput('SEQ(1)').result.toString()).toBe("10");
        expect(vm.processInput('SEQ(2)').result.toString()).toBe("20");
        expect(vm.processInput('SEQ(-1)').result.toString()).toBe("30");
    });

    it('should support MAP (HOC)', () => {
        // Define function F(x) = x * 2
        vm.processInput('F(x) -> x * 2');

        // MAP([1, 2, 3], F)
        const res = vm.processInput('MAP([1, 2, 3], "F")');
        if (res.type === 'error') console.error("MAP ERROR:", res.message);
        // result.result is Sequence
        expect(res.result.type).toBe('sequence');
        expect(res.result.values.length).toBe(3);
        expect(res.result.values[0].toString()).toBe("2"); // 1*2
        expect(res.result.values[1].toString()).toBe("4"); // 2*2
        expect(res.result.values[2].toString()).toBe("6"); // 3*2
    });

    it('should support REDUCE', () => {
        vm.processInput('SumFunc(a, b) -> a + b');
        const res = vm.processInput('REDUCE([1, 2, 3, 4], "SumFunc", 0)');
        if (res.type === 'error') console.error("REDUCE ERROR:", res.message);
        expect(res.result.toString()).toBe("10"); // 1+2+3+4
    });

    it('should support Anonymous Lambda in HOC', () => {
        // MAP([1,2,3], x -> x+1)
        // Note: Parser must support comma separation of lambda.
        // "x -> x+1" as argument.
        // Our regex in handleFunctionCall split by comma.
        // "MAP([1,2], x -> x+1)" -> args: "[1,2]", "x -> x+1"
        const res = vm.processInput('MAP([1, 2, 3], x -> x + 1)');
        if (res.type === 'error') console.error("LAMBDA ERROR:", res.message);
        expect(res.result.values[0].toString()).toBe("2");
        expect(res.result.values[2].toString()).toBe("4");
    });

    it('should support IRANGE (integer range) generation', () => {
        const res = vm.processInput('IRANGE(1, 4)');
        if (res.type === 'error') console.error("IRANGE ERROR:", res.message);
        expect(res.result.values.length).toBe(4);
        expect(res.result.values[0].toString()).toBe("1");
        expect(res.result.values[3].toString()).toBe("4");
    });

    it('should support RANGE with interval', () => {
        // RANGE(0:1, 3) should give [0, 1/2, 1]
        const res = vm.processInput('RANGE(0:1, 3)');
        if (res.type === 'error') console.error("RANGE ERROR:", res.message);
        expect(res.result.values.length).toBe(3);
        expect(res.result.values[0].toString()).toBe("0");
        expect(res.result.values[1].toString()).toBe("1/2");
        expect(res.result.values[2].toString()).toBe("1");
    });

    it('should support FIRST and LAST', () => {
        expect(vm.processInput('FIRST([10, 20, 30])').result.toString()).toBe("10");
        expect(vm.processInput('LAST([10, 20, 30])').result.toString()).toBe("30");
    });

    it('should support GETEL', () => {
        expect(vm.processInput('GETEL([10, 20, 30], 1)').result.toString()).toBe("10");
        expect(vm.processInput('GETEL([10, 20, 30], 2)').result.toString()).toBe("20");
        expect(vm.processInput('GETEL([10, 20, 30], -1)').result.toString()).toBe("30");
    });

});
