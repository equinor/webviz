import { ContinuousParameter, ParameterIdent } from "@framework/EnsembleParameters";
import { pearsonCorrelation } from "@modules/_shared/utils/math/pearsonCorrelation";

export type ResponseData = {
    realizations: number[];
    values: number[];
    displayName: string;
};
export type RankedParameterCorrelation = {
    ident: ParameterIdent;
    correlation: number | null;
    absCorrelation: number | null;
};
export type RankedParameterData = {
    ident: ParameterIdent;
    values: number[];
    realizations: number[];
};
export function createRankedParameterCorrelations(
    parameters: ContinuousParameter[],
    responses: ResponseData,
    numParams: number,
    absCutoff: number
): RankedParameterCorrelation[] {
    const responseValueMap = new Map<number, number>();

    for (let i = 0; i < responses.realizations.length; i++) {
        const realization = responses.realizations[i];
        const value = responses.values[i] as number;
        responseValueMap.set(realization, value);
    }

    const correlations = parameters.map((param) => {
        const x: number[] = [];
        const y: number[] = [];

        for (let i = 0; i < param.realizations.length; i++) {
            const realization = param.realizations[i];
            const parameterValue = param.values[i] as number;

            const responseValue = responseValueMap.get(realization);

            if (responseValue !== undefined) {
                x.push(parameterValue);
                y.push(responseValue);
            }
        }

        const corr = pearsonCorrelation(x, y);

        return {
            ident: ParameterIdent.fromNameAndGroup(param.name, param.groupName),
            correlation: corr,
            absCorrelation: corr !== null ? Math.abs(corr) : null,
        };
    });

    return correlations
        .filter((c) => c.absCorrelation !== null) // Filter out null correlations
        .filter((c) => Math.abs(c.absCorrelation!) >= absCutoff) // Filter by absolute cutoff
        .sort((a, b) => b.absCorrelation! - a.absCorrelation!) // Sort by absolute correlation
        .slice(0, numParams); // Limit to numParams
}

export function getRankedParameterData(
    rankedParameterCorrelations: RankedParameterCorrelation[],
    parameterArr: ContinuousParameter[]
): RankedParameterData[] {
    const rankedParameters: RankedParameterData[] = [];
    const parameterDataMap = new Map<string, ContinuousParameter>();

    parameterArr.forEach((p) => parameterDataMap.set(p.name, p));

    rankedParameterCorrelations.forEach((rankedParameter) => {
        const parameterData = parameterDataMap.get(rankedParameter.ident.name);
        if (parameterData) {
            rankedParameters.push({
                ident: rankedParameter.ident,
                values: parameterData.values,
                realizations: parameterData.realizations,
            });
        }
    });

    return rankedParameters;
}
