import React from "react";

import { useAtomValue } from "jotai";

import { EnsembleSetAtom, ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";

import type { SubplotGroup } from "../../typesAndEnums";
import {
    assignTraceColors,
    buildEnsembleColorMap,
    buildTraceEntries,
    groupTracesIntoSubplots,
} from "../../utils/subplotGroupBuilder";
import { colorByAtom, ensembleIdentsAtom, subplotByAtom } from "../atoms/baseAtoms";
import { vectorGroupDefsAtom } from "../atoms/derivedAtoms";
import { groupedVectorDataQueriesAtom } from "../atoms/queryAtoms";

/**
 * Builds the subplot groups consumed by the chart and data-channel hooks.
 *
 * Delegates the heavy lifting to utility functions in subplotGroupBuilder —
 * this hook only reads atoms and wires the pieces together.
 */
export function useSubplotGroups(selectedVectorBaseName: string | null, showRecoveryFactor: boolean): SubplotGroup[] {
    const queries = useAtomValue(groupedVectorDataQueriesAtom);
    const groupDefs = useAtomValue(vectorGroupDefsAtom);
    const colorBy = useAtomValue(colorByAtom);
    const subplotBy = useAtomValue(subplotByAtom);
    const ensembleIdents = useAtomValue(ensembleIdentsAtom);
    const ensembleSet = useAtomValue(EnsembleSetAtom);
    const validEnsembleRealizationsFunction = useAtomValue(ValidEnsembleRealizationsFunctionAtom);

    return React.useMemo(() => {
        if (!colorBy || groupDefs.length === 0) {
            return [];
        }

        const groupMetaMap = new Map(groupDefs.map((g) => [g.groupLabel, g]));
        const ensembleColorMap = buildEnsembleColorMap(ensembleIdents, ensembleSet);

        const traceEntries = buildTraceEntries(
            queries,
            ensembleSet,
            ensembleIdents,
            groupMetaMap,
            colorBy,
            subplotBy,
            selectedVectorBaseName,
            showRecoveryFactor,
            validEnsembleRealizationsFunction,
        );

        if (traceEntries.length === 0) return [];

        assignTraceColors(traceEntries, colorBy, ensembleColorMap);

        return groupTracesIntoSubplots(traceEntries, subplotBy);
    }, [
        queries,
        groupDefs,
        colorBy,
        subplotBy,
        ensembleIdents,
        ensembleSet,
        showRecoveryFactor,
        selectedVectorBaseName,
        validEnsembleRealizationsFunction,
    ]);
}
