import { Ensemble } from "@framework/Ensemble";
import { ContinuousParameter, ParameterIdent, ParameterType } from "@framework/EnsembleParameters";
import { ColorScale } from "@lib/utils/ColorScale";
import { MinMax } from "@lib/utils/MinMax";

export class ContinuousParameterColorScaleHelper {
    private _parameterIdent: ParameterIdent;
    private _ensembleContinuousParameterSet: { [ensembleName: string]: ContinuousParameter };
    private _minMax: MinMax;
    private _colorScale: ColorScale;

    constructor(parameterIdent: ParameterIdent, selectedEnsembles: Ensemble[], colorScale: ColorScale) {
        this._parameterIdent = parameterIdent;
        this._ensembleContinuousParameterSet = {};
        this._minMax = MinMax.createInvalid();
        for (const ensemble of selectedEnsembles) {
            const parameters = ensemble.getParameters();
            if (!parameters.hasParameter(parameterIdent)) continue;

            const parameter = parameters.getParameter(parameterIdent);
            if (parameter.type === ParameterType.CONTINUOUS) {
                this._ensembleContinuousParameterSet[ensemble.getEnsembleName()] = parameter;
                this._minMax = this._minMax.extendedBy(parameters.getContinuousParameterMinMax(parameterIdent));
            }
        }

        // TODO: Set Range [0,0] if parameterMinMax is invalid?
        this._colorScale = colorScale;
        const midValue = this._minMax.min + (this._minMax.max - this._minMax.min) / 2;
        this._colorScale.setRangeAndMidPoint(this._minMax.min, this._minMax.max, midValue);
    }

    getColorScale(): ColorScale {
        return this._colorScale;
    }

    getMinMax(): MinMax {
        return this._minMax;
    }

    getParameterIdent(): ParameterIdent {
        return this._parameterIdent;
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
