import { createStore } from "jotai";
import { describe, expect, it } from "vitest";

import { FIXUP, persistableFixableAtom, Source } from "../../src/framework/utils/atomUtils";

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

        // Now atom B becomes invalid (20 is not > 25). Both A and B already settled above, so masking
        // no longer applies: B is kept as-is and reported invalid instead of being silently auto-fixed.
        resultB = store.get(atomB);
        expect(resultB.isValidInContext).toBe(false); // Kept + reported invalid, not masked
        expect(resultB.value).toBe(20); // Unchanged - no longer auto-fixed on every read
        expect(resultB._source).toBe(Source.USER);

        // Manually triggering fixup repairs it
        store.set(atomB, FIXUP);
        resultB = store.get(atomB);
        expect(resultB.isValidInContext).toBe(true);
        expect(resultB.value).toBe(26); // Fixed up to 25 + 1
        expect(resultB._source).toBe(Source.USER);
    });

    it("should handle invalid first atom cascade dependency scenario", async () => {
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

        // User changes atom A to an invalid value
        store.set(atomA, -5);

        // Now atom B should remain unchanged because atom A is invalid
        resultB = store.get(atomB);
        expect(resultB.isValidInContext).toBe(true); // Still true because because invalid upstream atom A stops propagation
        expect(resultB.value).toBe(20); // Unchanged downstream atom
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

    it("should not corrupt a still-invalid persisted value regardless of subscribe/write order", async () => {
        // Regression test: the lifecycle effect used to capture a snapshot of internal state
        // synchronously and write it back from a queued microtask unconditionally. If another write
        // (e.g. a deserialize write) landed in the gap between the effect running and its microtask
        // firing, the stale snapshot would silently clobber the real value. This is most easily
        // triggered when something subscribes to (mounts) the atom BEFORE its persisted value is
        // written - the atom's very first effect pass then runs against the default {initialValue,
        // Source.USER} state and queues a write based on that, which can race with a subsequent
        // deserialize write for the real value.
        const knownEnsembles = new Set(["unfiltered", "filtered"]);
        const realizationsByEnsemble: Record<string, number[]> = {
            unfiltered: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            filtered: [0, 1, 2, 3, 4, 5],
        };

        const ensembleAtom = persistableFixableAtom<string | null>({
            initialValue: null,
            isValidFunction: ({ value }) => value !== null && knownEnsembles.has(value),
            fixupFunction: () => null,
        });

        const store = createStore();

        // Subscribe (mount) BEFORE writing the persisted value - the "wrong" order that used to
        // trigger the corruption.
        store.sub(ensembleAtom, () => {});

        // Simulate deserialization: a persisted, currently-invalid realization (10 is out of range
        // for the "filtered" ensemble) landing right after mount.
        const realizationAtom = persistableFixableAtom<number | null>({
            initialValue: null,
            isValidFunction: ({ get, value }) => {
                const ensembleId = get(ensembleAtom).value;
                const available = ensembleId ? (realizationsByEnsemble[ensembleId] ?? []) : [];
                if (value === null) return available.length === 0;
                return available.includes(value);
            },
            fixupFunction: ({ get }) => {
                const ensembleId = get(ensembleAtom).value;
                const available = ensembleId ? (realizationsByEnsemble[ensembleId] ?? []) : [];
                return available[0] ?? null;
            },
        });
        store.sub(realizationAtom, () => {});

        store.set(ensembleAtom, { value: "filtered", _source: Source.PERSISTENCE });
        store.set(realizationAtom, { value: 10, _source: Source.PERSISTENCE });

        for (let tick = 0; tick < 6; tick++) {
            await new Promise<void>((resolve) => queueMicrotask(resolve));
        }

        const ensembleResult = store.get(ensembleAtom);
        const realizationResult = store.get(realizationAtom);

        // Ensemble is genuinely valid, so it's expected to promote to USER.
        expect(ensembleResult.value).toBe("filtered");
        expect(ensembleResult._source).toBe(Source.USER);

        // Realization was never valid and was never touched by the user - it must stay exactly as
        // persisted (kept + reported invalid), not silently promoted/fixed-up to some other value.
        expect(realizationResult.value).toBe(10);
        expect(realizationResult.isValidInContext).toBe(false);
        expect(realizationResult._source).toBe(Source.PERSISTENCE);
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
