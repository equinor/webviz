import { getRelpermRealizationsCurveDataOptions, getRelpermStatisticalCurveDataOptions } from "@api";
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

export const relPermRealizationDataQueryAtom = atomWithQuery((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom);
    const selectedTableName = get(selectedRelPermTableNameAtom);
    const selectedRelPermSaturationAxis = get(selectedRelPermSaturationAxisAtom);
    const selectedSatNums = get(selectedSatNumsAtom);
    const selectedRelPermCurveNames = get(selectedRelPermCurveNamesAtom);
    const visualizationType = get(selectedVisualizationTypeAtom);
    const query = {
        ...getRelpermRealizationsCurveDataOptions({
            query: {
                case_uuid: selectedEnsembleIdent?.getCaseUuid() ?? "",
                ensemble_name: selectedEnsembleIdent?.getEnsembleName() ?? "",
                table_name: selectedTableName ?? "",
                saturation_axis_name: selectedRelPermSaturationAxis ?? "",
                curve_names: selectedRelPermCurveNames ?? [],
                satnums: selectedSatNums ?? [],
            },
        }),
        enabled: Boolean(
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
        ...getRelpermStatisticalCurveDataOptions({
            query: {
                case_uuid: selectedEnsembleIdent?.getCaseUuid() ?? "",
                ensemble_name: selectedEnsembleIdent?.getEnsembleName() ?? "",
                table_name: selectedTableName ?? "",
                saturation_axis_name: selectedRelPermSaturationAxis ?? "",
                curve_names: selectedRelPermCurveNames ?? [],
                satnums: selectedSatNums ?? [],
            },
        }),
        enabled: Boolean(
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
