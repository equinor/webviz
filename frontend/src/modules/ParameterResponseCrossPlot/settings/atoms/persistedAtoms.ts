import { persistableFixableAtom } from "@framework/utils/atomUtils";

import { availableParameterIdentsAtom } from "./derivedAtoms";

export const parameterIdentStringAtom = persistableFixableAtom<string | null, string[]>({
    initialValue: null,
    precomputeFunction: ({ get }) => {
        const availableParameterIdents = get(availableParameterIdentsAtom);
        return availableParameterIdents.map((ident) => ident.toString());
    },
    isValidFunction: ({ value, precomputedValue: availableParameterIdentStrings }) => {
        if (!value) {
            if (availableParameterIdentStrings.length === 0) {
                return true;
            }
            return false;
        }
        return availableParameterIdentStrings.includes(value);
    },
    fixupFunction: ({ value, precomputedValue: availableParameterIdentStrings }) => {
        if (availableParameterIdentStrings.length === 0) {
            return null;
        }
        if (!value) {
            return availableParameterIdentStrings[0];
        }
        if (availableParameterIdentStrings.includes(value)) {
            return value;
        }
        return availableParameterIdentStrings[0];
    },
});
