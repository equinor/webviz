import { isEqual } from "lodash";

import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { persistableFixableAtom } from "@framework/utils/atomUtils";
import { fixupRegularEnsembleIdent, maybeAssignFirstSyncedEnsemble } from "@framework/utils/ensembleUiHelpers";

import { fixupVectorName } from "../utils/fixupVectorName";

import { syncedRegularEnsembleIdentsAtom, syncedVectorNameAtom } from "./baseAtoms";
import { availableSensitivityNamesAtom, availableVectorNamesAtom } from "./derivedAtoms";
import { vectorListQueryAtom } from "./queryAtoms";

export const selectedRegularEnsembleIdentAtom = persistableFixableAtom<RegularEnsembleIdent | null>({
    initialValue: null,
    isValidFunction: ({ get, value }) => {
        const syncedEnsembleIdents = get(syncedRegularEnsembleIdentsAtom);
        const ensembleSet = get(EnsembleSetAtom);

        // Synced ensemble takes precedence
        const hasInvalidSyncedEnsemble =
            syncedEnsembleIdents !== null &&
            syncedEnsembleIdents.length > 0 &&
            !syncedEnsembleIdents.some((ident) => ident.equals(value));
        if (!value || hasInvalidSyncedEnsemble) {
            return false;
        }
        return ensembleSet.findEnsemble(value) !== null;
    },
    fixupFunction: ({ get, value }) => {
        const syncedRegularEnsembleIdents = get(syncedRegularEnsembleIdentsAtom);
        const ensembleSet = get(EnsembleSetAtom);

        const candidateEnsembleIdent = maybeAssignFirstSyncedEnsemble(value ?? null, syncedRegularEnsembleIdents);

        return fixupRegularEnsembleIdent(candidateEnsembleIdent, ensembleSet);
    },
});

/**
 * Atom that handles vector name and tag in synch with fixup
 */
export const selectedVectorNameAndTagAtom = persistableFixableAtom<{ name: string | null; tag: string | null }>({
    initialValue: { name: null, tag: null },
    areEqualFunction: isEqual,
    computeDependenciesState: ({ get }) => {
        const vectorListQuery = get(vectorListQueryAtom);
        if (vectorListQuery.isError) {
            return "error";
        }
        if (vectorListQuery.isFetching) {
            return "loading";
        }
        return "loaded";
    },
    isValidFunction: ({ get, value }) => {
        const syncedVectorName = get(syncedVectorNameAtom);
        const availableVectorNames = get(availableVectorNamesAtom);

        if (syncedVectorName) {
            return value.name === syncedVectorName && value.tag === syncedVectorName;
        }

        if (!value || (value.name && !availableVectorNames.includes(value.name))) {
            return false;
        }

        return true;
    },
    fixupFunction: ({ get, value }) => {
        const syncedVectorName = get(syncedVectorNameAtom);
        const availableVectorNames = get(availableVectorNamesAtom);

        if (syncedVectorName) {
            return { name: syncedVectorName, tag: syncedVectorName };
        }

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
