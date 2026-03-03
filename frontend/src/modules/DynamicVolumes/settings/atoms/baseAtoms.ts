import { atom } from "jotai";
import { isEqual } from "lodash";

import { Frequency_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { atomWithCompare, persistableFixableAtom } from "@framework/utils/atomUtils";
import { fixupRegularEnsembleIdents } from "@framework/utils/ensembleUiHelpers";

import { ColorBy, StatisticsType, VisualizationMode } from "../../typesAndEnums";

// ──────── Persistable / fixable atoms ────────

/** Multi-ensemble selection — array of RegularEnsembleIdent */
export const selectedEnsembleIdentsAtom = persistableFixableAtom<RegularEnsembleIdent[]>({
    initialValue: [],
    isValidFunction: ({ get, value }) => {
        if (value.length === 0) return false;
        const ensembleSet = get(EnsembleSetAtom);
        return value.every((ident) => ensembleSet.hasEnsemble(ident));
    },
    fixupFunction: ({ value, get }) => {
        const ensembleSet = get(EnsembleSetAtom);
        return fixupRegularEnsembleIdents(value ?? null, ensembleSet) ?? [];
    },
});

// ──────── Plain atoms ────────

export const resampleFrequencyAtom = atom<Frequency_api>(Frequency_api.MONTHLY);

export const visualizationModeAtom = atom<VisualizationMode>(VisualizationMode.StatisticalLines);

export const colorByAtom = atom<ColorBy>(ColorBy.Ensemble);

export const selectedStatisticsAtom = atom<StatisticsType[]>([
    StatisticsType.Mean,
    StatisticsType.P10,
    StatisticsType.P90,
]);

export const showHistogramAtom = atom<boolean>(true);

/** Selected base vector name, e.g. "ROIP" */
export const selectedVectorBaseNameAtom = atom<string | null>(null);

/** Selected FIP array, e.g. "FIPNUM" */
export const selectedFipArrayAtom = atom<string | null>(null);

/** Selected FIPNUM region numbers, e.g. [1, 2, 3] */
export const selectedRegionsAtom = atomWithCompare<number[]>([], isEqual);
