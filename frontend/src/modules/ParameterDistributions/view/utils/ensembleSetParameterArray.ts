import { ParameterType, type ParameterIdent } from "@framework/EnsembleParameters";
import type { EnsembleSet } from "@framework/EnsembleSet";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { EnsembleRealizationFilterFunction } from "@framework/WorkbenchSession";

export type EnsembleSetParameterArray = {
    parameterIdent: ParameterIdent;
    ensembleParameterRealizationAndValues: EnsembleParameterRealizationsAndValues[];
    isLogarithmic?: boolean;
};
export type EnsembleParameterRealizationsAndValues = {
    ensembleDisplayName: string;
    ensembleColor: string;
    realizations: number[];
    values: number[];
};

export function makeEnsembleSetParameterArray(
    ensembleSet: EnsembleSet,
    ensembleIdents: RegularEnsembleIdent[],
    parameterIdents: ParameterIdent[],
    filterEnsembleRealizations: EnsembleRealizationFilterFunction,
): EnsembleSetParameterArray[] {
    const parameterDataArr: EnsembleSetParameterArray[] = [];

    for (const parameterIdent of parameterIdents) {
        const parameterDataArrEntry: EnsembleSetParameterArray = {
            parameterIdent: parameterIdent,
            ensembleParameterRealizationAndValues: [],
        };

        for (const ensembleIdent of ensembleIdents) {
            const ensemble = ensembleSet.findEnsemble(ensembleIdent);
            if (!ensemble) continue;

            const ensembleParameters = ensemble.getParameters();
            if (!ensembleParameters.hasParameter(parameterIdent)) continue;

            const filteredRealizations = new Set(filterEnsembleRealizations(ensembleIdent));
            const parameter = ensembleParameters.getParameter(parameterIdent);
            parameterDataArrEntry.isLogarithmic =
                parameter.type === ParameterType.CONTINUOUS ? parameter.isLogarithmic : false;

            const parameterValues: number[] = [];
            const realizationNumbers: number[] = [];
            parameter.realizations.forEach((realization, index) => {
                if (filteredRealizations.has(realization)) {
                    parameterValues.push(parameter.values[index] as number);
                    realizationNumbers.push(realization);
                }
            });

            const ensembleParameterValues: EnsembleParameterRealizationsAndValues = {
                ensembleDisplayName: ensemble.getDisplayName(),
                ensembleColor: ensemble.getColor(),
                values: parameterValues,
                realizations: realizationNumbers,
            };

            parameterDataArrEntry.ensembleParameterRealizationAndValues.push(ensembleParameterValues);
        }

        if (parameterDataArrEntry.ensembleParameterRealizationAndValues.length > 0) {
            parameterDataArr.push(parameterDataArrEntry);
        }
    }

    return parameterDataArr;
}
