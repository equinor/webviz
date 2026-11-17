import { persistableFixableAtom } from "@framework/utils/atomUtils";

import { availableParameterIdentsAtom } from "./derivedAtoms";

export const parameterIdentStringAtom = persistableFixableAtom<string | null, string[]>({
    initialValue: null,
    precomputeFunction: ({ get }) => {
        const availableParameterIdents = get(availableParameterIdentsAtom);
        return availableParameterIdents.map((ident) => ident.toString());
    },
    // The parameters come from the received channel, which is only set after mounting - settling before there are any
    // would keep null once they are available
    computeDependenciesState: ({ precomputedValue: availableParameterIdentStrings }) =>
        availableParameterIdentStrings.length > 0 ? "loaded" : "blocked",
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
