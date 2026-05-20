import type { ParameterIdent } from "@framework/EnsembleParameters";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { ColorScale } from "@lib/utils/ColorScale";
import { MinMax } from "@lib/utils/MinMax";
import type { NumericParameter } from "@modules/_shared/parameterUtils";
import { isVaryingNumericParameter } from "@modules/_shared/parameterUtils";

export class EnsemblesParameterColoring {
    /**
     * Helper class working with coloring according to a selected numeric parameter across multiple ensembles.
     *
     * Retrieves min/max parameter value across all ensembles and provides interface for retrieving parameter
     * value within the min/max range for specific realization in ensemble.
     */

    private _parameterIdent: ParameterIdent;
    private _ensembleParameterMap: Map<string, NumericParameter>;
    private _colorScale: ColorScale;

    constructor(selectedRegularEnsembles: RegularEnsemble[], parameterIdent: ParameterIdent, colorScale: ColorScale) {
        this._parameterIdent = parameterIdent;
        this._ensembleParameterMap = new Map<string, NumericParameter>();
        let minMax = MinMax.createInvalid();
        for (const ensemble of selectedRegularEnsembles) {
            const ensembleParameters = ensemble.getParameters();
            const parameter = ensembleParameters.findParameter(parameterIdent);
            if (!parameter || !isVaryingNumericParameter(parameter)) continue;

            this._ensembleParameterMap.set(ensemble.getIdent().toString(), parameter);
            minMax = minMax.extendedBy(MinMax.fromNumericValues(parameter.values));
        }

        // Consider: Set Range [0,0] if parameterMinMax is invalid?
        this._colorScale = colorScale;
        const midValue = minMax.min + (minMax.max - minMax.min) / 2;
        this._colorScale.setRangeAndMidPoint(minMax.min, minMax.max, midValue);
    }

    getParameterDisplayName(): string {
        if (!this._parameterIdent.groupName) return this._parameterIdent.name;

        return `${this._parameterIdent.groupName}:${this._parameterIdent.name}`;
    }

    getColorScale(): ColorScale {
        return this._colorScale;
    }

    hasParameterForEnsemble(ensembleIdent: RegularEnsembleIdent): boolean {
        return this._ensembleParameterMap.has(ensembleIdent.toString());
    }

    hasParameterRealizationValue(ensembleIdent: RegularEnsembleIdent, realization: number): boolean {
        const parameter = this._ensembleParameterMap.get(ensembleIdent.toString());
        if (parameter === undefined) return false;

        return parameter.realizations.indexOf(realization) !== -1;
    }

    getParameterRealizationValue(ensembleIdent: RegularEnsembleIdent, realization: number): number {
        if (!this.hasParameterRealizationValue(ensembleIdent, realization)) {
            throw new Error(
                `Parameter ${this.getParameterDisplayName()} has no numerical value for realization ${realization} in ensemble ${ensembleIdent.toString()}`,
            );
        }
        const parameter = this._ensembleParameterMap.get(ensembleIdent.toString());
        if (parameter === undefined) {
            throw new Error(
                `Parameter ${this.getParameterDisplayName()} not found in ensemble ${ensembleIdent.toString()}`,
            );
        }
        const realizationIndex = parameter.realizations.indexOf(realization);
        return parameter.values[realizationIndex];
    }
}
