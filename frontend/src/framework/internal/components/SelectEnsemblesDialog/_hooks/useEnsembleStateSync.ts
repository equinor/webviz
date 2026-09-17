import React from "react";

import type { EnsembleSet } from "@framework/EnsembleSet";

import {
    makeDeltaEnsembleSettingsFromEnsembleSet,
    makeHashFromSelectedEnsembles,
    makeRegularEnsembleSettingsFromEnsembleSet,
    makeSelectableEnsemblesForDeltaFromEnsembleSet,
} from "../_utils";
import type { EnsembleIdentWithCaseName, InternalDeltaEnsembleSetting, InternalRegularEnsembleSetting } from "../types";

import type { StateTuple } from "./_types";

export type UseEnsembleStateSyncResult = {
    ensembleSetHash: string;
    selectedRegularEnsemblesState: StateTuple<InternalRegularEnsembleSetting[]>;
    selectedDeltaEnsemblesState: StateTuple<InternalDeltaEnsembleSetting[]>;
    selectableEnsemblesForDeltaState: StateTuple<EnsembleIdentWithCaseName[]>;
    resetStatesFromEnsembleSet: () => void;
};

/**
 * Hook to sync ensemble state with the active EnsembleSet.
 *
 * Manages selected regular/delta ensembles and selectable ensembles for delta
 */
export function useEnsembleStateSync(ensembleSet: EnsembleSet | null) {
    const [ensembleSetHash, setEnsembleSetHash] = React.useState<string>("");
    const [selectedRegularEnsembles, setSelectedRegularEnsembles] = React.useState<InternalRegularEnsembleSetting[]>(
        [],
    );
    const [selectedDeltaEnsembles, setSelectedDeltaEnsembles] = React.useState<InternalDeltaEnsembleSetting[]>([]);
    const [selectableEnsemblesForDelta, setSelectableEnsemblesForDelta] = React.useState<EnsembleIdentWithCaseName[]>(
        [],
    );

    const resetStatesFromEnsembleSet = React.useCallback(() => {
        if (!ensembleSet) {
            return;
        }

        const regularEnsembles = makeRegularEnsembleSettingsFromEnsembleSet(ensembleSet);
        const deltaEnsembles = makeDeltaEnsembleSettingsFromEnsembleSet(ensembleSet);
        const selectableEnsembles = makeSelectableEnsemblesForDeltaFromEnsembleSet(ensembleSet);

        setSelectedRegularEnsembles(regularEnsembles);
        setSelectedDeltaEnsembles(deltaEnsembles);
        setSelectableEnsemblesForDelta(selectableEnsembles);
        setEnsembleSetHash(makeHashFromSelectedEnsembles(regularEnsembles, deltaEnsembles));
    }, [ensembleSet]);

    // ! This one should start empty to ensure the below functions fire at least once
    const [prevEnsembleSet, setPrevEnsembleSet] = React.useState<EnsembleSet | null>();

    if (ensembleSet !== prevEnsembleSet) {
        setPrevEnsembleSet(ensembleSet);
        resetStatesFromEnsembleSet();
    }

    return {
        ensembleSetHash,
        selectedRegularEnsemblesState: [selectedRegularEnsembles, setSelectedRegularEnsembles] as const,
        selectedDeltaEnsemblesState: [selectedDeltaEnsembles, setSelectedDeltaEnsembles] as const,
        selectableEnsemblesForDeltaState: [selectableEnsemblesForDelta, setSelectableEnsemblesForDelta] as const,
        resetStatesFromEnsembleSet,
    };
}
