import { persistableFixableAtom } from "@framework/utils/atomUtils";

// Simple atom - value must be between 1 and 100
export const simpleNumberAtom = persistableFixableAtom({
    initialValue: 50,
    isValidFunction: ({ value }) => value >= 1 && value <= 100,
    fixupFunction: ({ value }) => {
        if (value === undefined || value < 1) return 1;
        if (value > 100) return 100;
        return value;
    },
});

// Dependent atom A - must be positive
export const upstreamAtom = persistableFixableAtom({
    initialValue: 10,
    isValidFunction: ({ value }) => value > 0,
    fixupFunction: () => 1,
});

// Dependent atom B - must be greater than upstream atom
export const downstreamAtom = persistableFixableAtom({
    initialValue: 20,
    isValidFunction: ({ value, get }) => {
        const upstreamValue = get(upstreamAtom).value;
        return value > upstreamValue;
    },
    fixupFunction: ({ get }) => {
        const upstreamValue = get(upstreamAtom).value;
        return upstreamValue + 1;
    },
});

// Atom with precompute
export const precomputedAtom = persistableFixableAtom({
    initialValue: 5,
    precomputeFunction: ({ value }) => {
        return { doubled: value !== undefined ? value * 2 : 0 };
    },
    isValidFunction: ({ precomputedValue }) => {
        return precomputedValue.doubled >= 10 && precomputedValue.doubled <= 50;
    },
    fixupFunction: () => 10,
});
