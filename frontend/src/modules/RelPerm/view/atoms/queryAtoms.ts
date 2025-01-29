import { getRelpermRealizationsCurveDataOptions, getRelpermStatisticalCurveDataOptions } from "@api";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";
import { VisualizationType } from "@modules/RelPerm/typesAndEnums";

import { Getter } from "jotai";

import { relPermSpecificationsAtom, selectedVisualizationTypeAtom } from "./baseAtoms";

export const relPermRealizationDataQueryAtom = atomWithQueries((get: Getter) => {
    const relPermSpecifications = get(relPermSpecificationsAtom);

    return {
        queries: relPermSpecifications.map((item) => (get: Getter) => {
            const visualizationType = get(selectedVisualizationTypeAtom);

            if (isEnsembleIdentOfType(item.ensembleIdent, RegularEnsembleIdent)) {
                return {
                    ...getRelpermRealizationsCurveDataOptions({
                        query: {
                            case_uuid: item.ensembleIdent.getCaseUuid(),
                            ensemble_name: item.ensembleIdent.getEnsembleName(),
                            table_name: item.tableName,
                            saturation_axis_name: item.saturationAxisName,
                            curve_names: item.curveNames,
                            satnum: item.satNum,
                        },
                    }),
                    enabled: visualizationType === VisualizationType.INDIVIDUAL_REALIZATIONS,
                };
            }

            if (isEnsembleIdentOfType(item.ensembleIdent, DeltaEnsembleIdent)) {
                return {
                    ...getRelpermRealizationsCurveDataOptions({
                        query: {
                            case_uuid: item.ensembleIdent.getComparisonEnsembleIdent().getCaseUuid(),
                            ensemble_name: item.ensembleIdent.getComparisonEnsembleIdent().getEnsembleName(),
                            table_name: item.tableName,
                            saturation_axis_name: item.saturationAxisName,
                            curve_names: item.curveNames,
                            satnum: item.satNum,
                        },
                    }),
                    enabled: visualizationType === VisualizationType.INDIVIDUAL_REALIZATIONS,
                };
            }

            throw new Error(`Invalid ensemble ident type: ${item.ensembleIdent}`);
        }),
    };
});

export const relPermStatisticalDataQueryAtom = atomWithQueries((get: Getter) => {
    const relPermSpecifications = get(relPermSpecificationsAtom);

    return {
        queries: relPermSpecifications.map((item) => (get: Getter) => {
            const visualizationType = get(selectedVisualizationTypeAtom);

            if (isEnsembleIdentOfType(item.ensembleIdent, RegularEnsembleIdent)) {
                return {
                    ...getRelpermStatisticalCurveDataOptions({
                        query: {
                            case_uuid: item.ensembleIdent.getCaseUuid(),
                            ensemble_name: item.ensembleIdent.getEnsembleName(),
                            table_name: item.tableName,
                            saturation_axis_name: item.saturationAxisName,
                            curve_names: item.curveNames,
                            satnums: [item.satNum],
                        },
                    }),
                    enabled: visualizationType === VisualizationType.STATISTICAL_FANCHART,
                };
            }

            if (isEnsembleIdentOfType(item.ensembleIdent, DeltaEnsembleIdent)) {
                return {
                    ...getRelpermStatisticalCurveDataOptions({
                        query: {
                            case_uuid: item.ensembleIdent.getComparisonEnsembleIdent().getCaseUuid(),
                            ensemble_name: item.ensembleIdent.getComparisonEnsembleIdent().getEnsembleName(),
                            table_name: item.tableName,
                            saturation_axis_name: item.saturationAxisName,
                            curve_names: item.curveNames,
                            satnums: [item.satNum],
                        },
                    }),
                    enabled: visualizationType === VisualizationType.STATISTICAL_FANCHART,
                };
            }

            throw new Error(`Invalid ensemble ident type: ${item.ensembleIdent}`);
        }),
    };
});
