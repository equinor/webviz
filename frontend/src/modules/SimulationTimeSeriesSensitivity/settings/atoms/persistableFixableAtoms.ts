import { isEqual } from "lodash-es";

import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { computeQueryDependenciesState, persistableFixableAtom } from "@framework/utils/atomUtils";
import { fixupRegularEnsembleIdent } from "@framework/utils/ensembleUiHelpers";

import { fixupVectorName } from "../utils/fixupVectorName";

import { availableSensitivityNamesAtom, availableVectorNamesAtom } from "./derivedAtoms";
import { vectorListQueryAtom } from "./queryAtoms";

// Synced ensembles are written straight into this atom by the settings' sync handler, so validity
// only needs to check against the ensemble set.
export const selectedRegularEnsembleIdentAtom = persistableFixableAtom<RegularEnsembleIdent | null>({
    initialValue: null,
    isValidFunction: ({ get, value }) => {
        const ensembleSet = get(EnsembleSetAtom);

        if (!value) {
            return false;
        }
        return ensembleSet.findEnsemble(value) !== null;
    },
    fixupFunction: ({ get, value }) => {
        const ensembleSet = get(EnsembleSetAtom);

        return fixupRegularEnsembleIdent(value ?? null, ensembleSet);
    },
});

/**
 * Atom that handles vector name and tag with fixup. Synced vector names are written straight into
 * this atom by the settings' sync handler.
 */
export const selectedVectorNameAndTagAtom = persistableFixableAtom<{ name: string | null; tag: string | null } | null>({
    initialValue: null,
    areEqualFunction: isEqual,
    // A disabled query (e.g. while the ensemble is invalid) is "blocked", whatever it has cached
    computeDependenciesState: ({ get }) => computeQueryDependenciesState(get(vectorListQueryAtom)),
    isValidFunction: ({ get, value }) => {
        const availableVectorNames = get(availableVectorNamesAtom);

        if (!value) {
            return false;
        }
        // A tag that resolves to no available vector (e.g. typed, or kept from another ensemble) is no valid selection -
        // unless there are no vectors to select at all
        if (value.name === null) {
            return availableVectorNames.length === 0;
        }
        return availableVectorNames.includes(value.name);
    },
    fixupFunction: ({ get, value }) => {
        const availableVectorNames = get(availableVectorNamesAtom);

        const fixedUpVectorName = fixupVectorName(value?.name ?? null, availableVectorNames);
        if (fixedUpVectorName !== value?.name) {
            return { name: fixedUpVectorName, tag: fixedUpVectorName };
        }

        return value;
    },
});

export const selectedSensitivityNamesAtom = persistableFixableAtom<string[] | null>({
    initialValue: null,
    areEqualFunction: isEqual,
    isValidFunction: ({ get, value }) => {
        const availableSensitivityNames = get(availableSensitivityNamesAtom);
        if (!value) {
            return false;
        }
        return value.every((sensName) => availableSensitivityNames.includes(sensName));
    },
    fixupFunction: ({ get, value }) => {
        const availableSensitivityNames = get(availableSensitivityNamesAtom);

        // If user selected empty, do not override it
        if (value?.length === 0) {
            return [];
        }

        const fixedUpSensitivityNames =
            value?.filter((sensName) => availableSensitivityNames.includes(sensName)) ?? null;
        if (!fixedUpSensitivityNames || fixedUpSensitivityNames.length === 0) {
            return [...availableSensitivityNames];
        }

        return [...fixedUpSensitivityNames];
    },
});
