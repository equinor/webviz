import { Ensemble } from "@framework/Ensemble";
import { ContinuousParameter, Parameter, ParameterIdent, ParameterType } from "@framework/EnsembleParameters";
import { ColorScale } from "@lib/utils/ColorScale";
import { MinMax } from "@lib/utils/MinMax";

export class ParameterColorScaleHelper {
    private _parameterIdent: ParameterIdent;
    private _ensembleContinuousParameterSet: { [ensembleName: string]: Parameter };
    private _minMax: MinMax;
    private _colorScale: ColorScale;

    constructor(parameterIdent: ParameterIdent, selectedEnsembles: Ensemble[], colorScale: ColorScale) {
        this._parameterIdent = parameterIdent;
        this._ensembleContinuousParameterSet = {};
        this._minMax = MinMax.createInvalid();
        for (const ensemble of selectedEnsembles) {
            const parameters = ensemble.getParameters();
            const continuousParameters = parameters.getParameterIdents(ParameterType.CONTINUOUS);
            const hasParameter = continuousParameters.some((elm) => elm.equals(this._parameterIdent));
            if (!hasParameter) continue;

            const parameter = parameters.getParameter(parameterIdent);
            this._ensembleContinuousParameterSet[ensemble.getEnsembleName()] = parameter;
            this._minMax = this._minMax.extendedBy(parameters.getContinuousParameterMinMax(parameterIdent));
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
        return this._ensembleContinuousParameterSet[ensembleName] !== null;
    }

    hasParameterRealizationValue(ensembleName: string, realization: number): boolean {
        if (!this.hasEnsembleName(ensembleName)) return false;

        const parameter = this._ensembleContinuousParameterSet[ensembleName];
        const realizationIndex = parameter.realizations.indexOf(realization);
        if (realizationIndex === -1) return false;

        return parameter.values[realizationIndex] !== null;
    }

    getParameterRealizationValue(ensembleName: string, realization: number): number {
        if (!this.hasParameterRealizationValue(ensembleName, realization)) {
            throw new Error(
                `Parameter ${this._parameterIdent.toString()} has no value for realization ${realization} in ensemble ${ensembleName}`
            );
        }

        // This cast `as` relies on the verification of continuous parameter values in the constructor
        return (this._ensembleContinuousParameterSet[ensembleName] as ContinuousParameter).values[realization];
    }
}
