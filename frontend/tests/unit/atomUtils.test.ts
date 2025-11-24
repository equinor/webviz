import { createStore } from "jotai";
import { describe, expect, it } from "vitest";

import { persistableFixableAtom, Source } from "../../src/framework/utils/atomUtils";

describe("persistableFixableAtom - auto-transition logic", () => {
    it("should transition PERSISTENCE source to USER when atom becomes valid", async () => {
        const myAtom = persistableFixableAtom({
            initialValue: 10,
            isValidFunction: ({ value }) => value > 0,
            fixupFunction: () => 1,
        });

        const store = createStore();

        // Subscribe to the atom to mount it and activate the effect
        store.sub(myAtom, () => {});

        // Set persisted value that is valid
        store.set(myAtom, { value: 5, _source: Source.PERSISTENCE });

        // Read the atom - should be valid but still have PERSISTENCE source initially
        let result = store.get(myAtom);
        expect(result.value).toBe(5);
        expect(result.isValidInContext).toBe(true);
        expect(result._source).toBe(Source.PERSISTENCE);

        // Wait for effect to run (effects run in next microtask)
        await new Promise<void>((resolve) => queueMicrotask(resolve));

        // After effect runs, source should transition to USER
        result = store.get(myAtom);
        expect(result.value).toBe(5);
        expect(result.isValidInContext).toBe(true);
        expect(result._source).toBe(Source.USER);
    });

    it("should NOT transition PERSISTENCE source to USER when atom is invalid", async () => {
        const myAtom = persistableFixableAtom({
            initialValue: 10,
            isValidFunction: ({ value }) => value > 0,
            fixupFunction: () => 1,
        });

        const store = createStore();

        // Set persisted value that is INVALID
        store.set(myAtom, { value: -5, _source: Source.PERSISTENCE });

        // Read the atom - should be invalid
        let result = store.get(myAtom);
        expect(result.value).toBe(-5);
        expect(result.isValidInContext).toBe(false);
        expect(result._source).toBe(Source.PERSISTENCE);

        // Wait for effect to run
        await new Promise<void>((resolve) => queueMicrotask(resolve));

        // After effect runs, source should STILL be PERSISTENCE (not transitioned)
        result = store.get(myAtom);
        expect(result.value).toBe(-5);
        expect(result.isValidInContext).toBe(false);
        expect(result._source).toBe(Source.PERSISTENCE);
    });

    it("should transition TEMPLATE source to USER when atom becomes valid", async () => {
        const myAtom = persistableFixableAtom({
            initialValue: 10,
            isValidFunction: ({ value }) => value > 0,
            fixupFunction: () => 1,
        });

        const store = createStore();

        // Subscribe to the atom to mount it and activate the effect
        store.sub(myAtom, () => {});

        // Set template value that is valid
        store.set(myAtom, { value: 5, _source: Source.TEMPLATE });

        // Read the atom
        let result = store.get(myAtom);
        expect(result._source).toBe(Source.TEMPLATE);

        // Wait for effect to run
        await new Promise<void>((resolve) => queueMicrotask(resolve));

        // After effect runs, source should transition to USER
        result = store.get(myAtom);
        expect(result._source).toBe(Source.USER);
    });

    it("should NOT transition USER source (should remain USER)", async () => {
        const myAtom = persistableFixableAtom({
            initialValue: 10,
            isValidFunction: ({ value }) => value > 0,
            fixupFunction: () => 1,
        });

        const store = createStore();

        // Set user value
        store.set(myAtom, 5);

        // Read the atom
        let result = store.get(myAtom);
        expect(result.value).toBe(5);
        expect(result._source).toBe(Source.USER);

        // Wait for effect to run
        await new Promise<void>((resolve) => queueMicrotask(resolve));

        // Should still be USER
        result = store.get(myAtom);
        expect(result._source).toBe(Source.USER);
    });

    it("should NOT transition when atom is loading", async () => {
        const myAtom = persistableFixableAtom({
            initialValue: 10,
            computeDependenciesState: () => "loading",
            isValidFunction: ({ value }) => value > 0,
            fixupFunction: () => 1,
        });

        const store = createStore();

        // Set persisted value that would be valid
        store.set(myAtom, { value: 5, _source: Source.PERSISTENCE });

        // Read the atom
        let result = store.get(myAtom);
        expect(result.isLoading).toBe(true);
        expect(result._source).toBe(Source.PERSISTENCE);

        // Wait for effect to run
        await new Promise<void>((resolve) => queueMicrotask(resolve));

        // Should NOT transition because isLoading is true
        result = store.get(myAtom);
        expect(result._source).toBe(Source.PERSISTENCE);
    });

    it("should NOT transition when dependencies have errors", async () => {
        const myAtom = persistableFixableAtom({
            initialValue: 10,
            computeDependenciesState: () => "error",
            isValidFunction: ({ value }) => value > 0,
            fixupFunction: () => 1,
        });

        const store = createStore();

        // Set persisted value that would be valid
        store.set(myAtom, { value: 5, _source: Source.PERSISTENCE });

        // Read the atom
        let result = store.get(myAtom);
        expect(result.depsHaveError).toBe(true);
        expect(result._source).toBe(Source.PERSISTENCE);

        // Wait for effect to run
        await new Promise<void>((resolve) => queueMicrotask(resolve));

        // Should NOT transition because depsHaveError is true
        result = store.get(myAtom);
        expect(result._source).toBe(Source.PERSISTENCE);
    });

    it("should handle cascading dependency scenario", async () => {
        // Atom A - upstream dependency
        const atomA = persistableFixableAtom({
            initialValue: 10,
            isValidFunction: ({ value }) => value > 0,
            fixupFunction: () => 1,
        });

        // Atom B - depends on atom A
        const atomB = persistableFixableAtom({
            initialValue: 20,
            isValidFunction: ({ value, get }) => {
                const valueA = get(atomA).value;
                // B is valid only if its value is greater than A's value
                return value > valueA;
            },
            fixupFunction: ({ get }) => {
                const valueA = get(atomA).value;
                return valueA + 1;
            },
        });

        const store = createStore();

        // Subscribe to both atoms to mount them and activate effects
        store.sub(atomA, () => {});
        store.sub(atomB, () => {});

        // Set both as persisted and valid
        store.set(atomA, { value: 10, _source: Source.PERSISTENCE });
        store.set(atomB, { value: 20, _source: Source.PERSISTENCE });

        // Both should be valid
        let resultA = store.get(atomA);
        let resultB = store.get(atomB);
        expect(resultA.isValidInContext).toBe(true);
        expect(resultB.isValidInContext).toBe(true);

        // Wait for effects to run - both should transition to USER
        await new Promise<void>((resolve) => queueMicrotask(resolve));

        resultA = store.get(atomA);
        resultB = store.get(atomB);
        expect(resultA._source).toBe(Source.USER);
        expect(resultB._source).toBe(Source.USER);

        // User changes atom A to a larger value
        store.set(atomA, 25);

        // Now atom B becomes invalid (20 is not > 25)
        resultB = store.get(atomB);
        expect(resultB.isValidInContext).toBe(true); // Still true because source is USER, so it auto-fixes
        expect(resultB.value).toBe(26); // Auto-fixed to 25 + 1
        expect(resultB._source).toBe(Source.USER);
    });

    it("should show warning for initially invalid persisted state", async () => {
        const atomA = persistableFixableAtom({
            initialValue: 10,
            isValidFunction: ({ value }) => value > 0 && value < 100,
            fixupFunction: () => 50,
        });

        const store = createStore();

        // Set persisted value that is invalid from the start
        store.set(atomA, { value: 200, _source: Source.PERSISTENCE });

        // Should be invalid and show the persisted value (not auto-fix)
        let result = store.get(atomA);
        expect(result.value).toBe(200);
        expect(result.isValidInContext).toBe(false);
        expect(result._source).toBe(Source.PERSISTENCE);

        // Wait for effect
        await new Promise<void>((resolve) => queueMicrotask(resolve));

        // Should still be invalid (no transition because it's not valid)
        result = store.get(atomA);
        expect(result.value).toBe(200);
        expect(result.isValidInContext).toBe(false);
        expect(result._source).toBe(Source.PERSISTENCE);
    });

    it("should work with precompute function", async () => {
        const myAtom = persistableFixableAtom({
            precomputeFunction: ({ value }) => {
                return { computed: value !== undefined ? value * 2 : 0 };
            },
            isValidFunction: ({ precomputedValue }) => precomputedValue.computed > 10,
            fixupFunction: () => 10,
        });

        const store = createStore();

        // Subscribe to the atom to mount it and activate the effect
        store.sub(myAtom, () => {});

        // Set persisted value that is valid (6 * 2 = 12 > 10)
        store.set(myAtom, { value: 6, _source: Source.PERSISTENCE });

        let result = store.get(myAtom);
        expect(result.isValidInContext).toBe(true);
        expect(result._source).toBe(Source.PERSISTENCE);

        // Wait for effect
        await new Promise<void>((resolve) => queueMicrotask(resolve));

        // Should transition to USER
        result = store.get(myAtom);
        expect(result._source).toBe(Source.USER);
    });
});
