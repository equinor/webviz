import { Ensemble } from "@framework/Ensemble";
import { ContinuousParameter, ParameterIdent, ParameterType } from "@framework/EnsembleParameters";
import { ColorScale } from "@lib/utils/ColorScale";
import { MinMax } from "@lib/utils/MinMax";

export class EnsemblesContinuousParameterColoring {
    /**
     * Helper class working with coloring according to selected continuous parameter across multiple ensembles
     *
     * Retrieves min/max parameter value across all ensembles and provides interface for retrieving parameter
     * value within the min/max range for specific realization in ensemble.
     */

    private _parameterIdent: ParameterIdent;
    private _ensembleContinuousParameterSet: { [ensembleName: string]: ContinuousParameter };
    private _colorScale: ColorScale;

    constructor(selectedEnsembles: Ensemble[], parameterIdent: ParameterIdent, colorScale: ColorScale) {
        this._parameterIdent = parameterIdent;
        this._ensembleContinuousParameterSet = {};
        let minMax = MinMax.createInvalid();
        for (const ensemble of selectedEnsembles) {
            const parameters = ensemble.getParameters();
            if (!parameters.hasParameter(parameterIdent)) continue;

            const parameter = parameters.getParameter(parameterIdent);
            if (parameter.type === ParameterType.CONTINUOUS) {
                this._ensembleContinuousParameterSet[ensemble.getEnsembleName()] = parameter;
                minMax = minMax.extendedBy(parameters.getContinuousParameterMinMax(parameterIdent));
            }
        }

        // Consider: Set Range [0,0] if parameterMinMax is invalid?
        this._colorScale = colorScale;
        const midValue = minMax.min + (minMax.max - minMax.min) / 2;
        this._colorScale.setRangeAndMidPoint(minMax.min, minMax.max, midValue);
    }

    getColorScale(): ColorScale {
        return this._colorScale;
    }

    hasEnsembleName(ensembleName: string): boolean {
        return ensembleName in this._ensembleContinuousParameterSet;
    }

    hasParameterRealizationNumericalValue(ensembleName: string, realization: number): boolean {
        if (!this.hasEnsembleName(ensembleName)) return false;

        const parameter = this._ensembleContinuousParameterSet[ensembleName];
        return parameter.realizations.indexOf(realization) !== -1;
    }

    getParameterRealizationValue(ensembleName: string, realization: number): number {
        if (!this.hasParameterRealizationNumericalValue(ensembleName, realization)) {
            throw new Error(
                `Parameter ${this._parameterIdent.toString()} has no numerical value for realization ${realization} in ensemble ${ensembleName}`
            );
        }

        const parameter = this._ensembleContinuousParameterSet[ensembleName];
        const realizationIndex = parameter.realizations.indexOf(realization);
        return parameter.values[realizationIndex];
    }
}
