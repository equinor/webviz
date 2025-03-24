import { getRelpermRealizationsCurveData } from "@api";
import { ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { encodeAsUintListStr } from "@lib/utils/queryStringUtils";

import { relPermSpecificationsAtom } from "./baseAtoms";

export const relPermRealizationDataQueryAtom = atomWithQueries((get) => {
    const relPermSpecifications = get(relPermSpecificationsAtom);
    const validEnsembleRealizationsFunction = get(ValidEnsembleRealizationsFunctionAtom);
    const queries = relPermSpecifications.map((item) => {
        const realizations = [...validEnsembleRealizationsFunction(item.ensembleIdent)];
        const realizationsEncodedAsUintListStr = realizations ? encodeAsUintListStr(realizations) : null;
        return () => ({
            queryKey: [
                "getRelpermRealizationsCurveData",
                item.ensembleIdent.getCaseUuid(),
                item.ensembleIdent.getEnsembleName(),
                item.tableName,
                item.saturationAxisName,
                item.curveNames,
                item.satNum,
                realizationsEncodedAsUintListStr,
            ],
            queryFn: async () => {
                const { data } = await getRelpermRealizationsCurveData({
                    query: {
                        case_uuid: item.ensembleIdent.getCaseUuid(),
                        ensemble_name: item.ensembleIdent.getEnsembleName(),
                        table_name: item.tableName,
                        saturation_axis_name: item.saturationAxisName,
                        curve_names: item.curveNames,
                        satnum: item.satNum,
                        realizations_encoded_as_uint_list_str: realizationsEncodedAsUintListStr,
                    },
                    throwOnError: true,
                });
                return data;
            },
        });
    });
    return { queries };
});
