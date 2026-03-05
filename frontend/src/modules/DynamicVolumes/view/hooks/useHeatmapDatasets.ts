import React from "react";

import { useAtomValue } from "jotai";

import { ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";

import type { HeatmapDataset } from "../../typesAndEnums";
import { buildHeatmapDatasets } from "../../utils/heatmapDataBuilder";
import { colorByAtom, ensembleIdentsAtom } from "../atoms/baseAtoms";
import { vectorGroupDefsAtom } from "../atoms/derivedAtoms";
import { groupedVectorDataQueriesAtom } from "../atoms/queryAtoms";

/**
 * Builds HeatmapDataset[] for the drainage heatmap visualization.
 *
 * One dataset per ensemble; each dataset contains the mean value (or mean RF)
 * per region/zone per timestep for the heatmap cells.
 */
export function useHeatmapDatasets(
    selectedVectorBaseName: string | null,
    showRecoveryFactor: boolean,
): HeatmapDataset[] {
    const queries = useAtomValue(groupedVectorDataQueriesAtom);
    const groupDefs = useAtomValue(vectorGroupDefsAtom);
    const colorBy = useAtomValue(colorByAtom);
    const ensembleIdents = useAtomValue(ensembleIdentsAtom);
    const validEnsembleRealizationsFunction = useAtomValue(ValidEnsembleRealizationsFunctionAtom);

    return React.useMemo(() => {
        if (!colorBy || groupDefs.length === 0) return [];

        const groupMetaMap = new Map(groupDefs.map((g) => [g.groupLabel, g]));

        return buildHeatmapDatasets(
            queries,
            ensembleIdents,
            groupMetaMap,
            colorBy,
            selectedVectorBaseName,
            showRecoveryFactor,
            validEnsembleRealizationsFunction,
        );
    }, [
        queries,
        groupDefs,
        colorBy,
        ensembleIdents,
        selectedVectorBaseName,
        showRecoveryFactor,
        validEnsembleRealizationsFunction,
    ]);
}
