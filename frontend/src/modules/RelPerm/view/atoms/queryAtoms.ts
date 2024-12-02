import { apiService } from "@framework/ApiService";
import {
    selectedRelPermSaturationAxisAtom,
    selectedRelPermTableNameAtom,
} from "@modules/RelPerm/settings/atoms/derivedAtoms";
import { VisualizationType } from "@modules/RelPerm/typesAndEnums";

import { atomWithQuery } from "jotai-tanstack-query";

import {
    selectedEnsembleIdentAtom,
    selectedRelPermCurveNamesAtom,
    selectedSatNumsAtom,
    selectedVisualizationTypeAtom,
} from "./baseAtoms";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export const relPermRealizationDataQueryAtom = atomWithQuery((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom);
    const selectedTableName = get(selectedRelPermTableNameAtom);
    const selectedRelPermSaturationAxis = get(selectedRelPermSaturationAxisAtom);
    const selectedSatNums = get(selectedSatNumsAtom);
    const selectedRelPermCurveNames = get(selectedRelPermCurveNamesAtom);
    const visualizationType = get(selectedVisualizationTypeAtom);

    const query = {
        queryKey: [
            "getRelPermRealizationData",
            selectedEnsembleIdent?.getCaseUuid(),
            selectedEnsembleIdent?.getEnsembleName(),
            selectedTableName,
            selectedRelPermSaturationAxis,
            selectedSatNums,
            selectedRelPermCurveNames,
        ],
        queryFn: () =>
            apiService.relperm.getRealizationsCurveData(
                selectedEnsembleIdent?.getCaseUuid() ?? "",
                selectedEnsembleIdent?.getEnsembleName() ?? "",
                selectedTableName ?? "",
                selectedRelPermSaturationAxis ?? "",
                selectedRelPermCurveNames ?? [],
                selectedSatNums ?? []
            ),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: !!(
            selectedEnsembleIdent?.getCaseUuid() &&
            selectedEnsembleIdent?.getEnsembleName() &&
            selectedTableName &&
            selectedRelPermSaturationAxis &&
            selectedSatNums &&
            selectedRelPermCurveNames &&
            visualizationType === VisualizationType.INDIVIDUAL_REALIZATIONS
        ),
    };
    return query;
});

export const relPermStatisticalDataQueryAtom = atomWithQuery((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom);
    const selectedTableName = get(selectedRelPermTableNameAtom);
    const selectedRelPermSaturationAxis = get(selectedRelPermSaturationAxisAtom);
    const selectedSatNums = get(selectedSatNumsAtom);
    const selectedRelPermCurveNames = get(selectedRelPermCurveNamesAtom);
    const visualizationType = get(selectedVisualizationTypeAtom);

    const query = {
        queryKey: [
            "getRelPermStatisticalData",
            selectedEnsembleIdent?.getCaseUuid(),
            selectedEnsembleIdent?.getEnsembleName(),
            selectedTableName,
            selectedRelPermSaturationAxis,
            selectedSatNums,
            selectedRelPermCurveNames,
        ],
        queryFn: () =>
            apiService.relperm.getStatisticalCurveData(
                selectedEnsembleIdent?.getCaseUuid() ?? "",
                selectedEnsembleIdent?.getEnsembleName() ?? "",
                selectedTableName ?? "",
                selectedRelPermSaturationAxis ?? "",
                selectedRelPermCurveNames ?? [],
                selectedSatNums ?? []
            ),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: !!(
            selectedEnsembleIdent?.getCaseUuid() &&
            selectedEnsembleIdent?.getEnsembleName() &&
            selectedTableName &&
            selectedRelPermSaturationAxis &&
            selectedSatNums &&
            selectedRelPermCurveNames &&
            visualizationType === VisualizationType.STATISTICAL_FANCHART
        ),
    };
    return query;
});
