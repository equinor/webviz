import { Ensemble } from "@framework/Ensemble";
import { EnsembleIdent } from "@framework/EnsembleIdent";
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
    private _ensembleContinuousParameterSet: Map<EnsembleIdent, ContinuousParameter>;
    private _colorScale: ColorScale;

    constructor(selectedEnsembles: Ensemble[], parameterIdent: ParameterIdent, colorScale: ColorScale) {
        this._parameterIdent = parameterIdent;
        this._ensembleContinuousParameterSet = new Map<EnsembleIdent, ContinuousParameter>();
        let minMax = MinMax.createInvalid();
        for (const ensemble of selectedEnsembles) {
            const parameters = ensemble.getParameters();
            if (!parameters.hasParameter(parameterIdent)) continue;

            const parameter = parameters.getParameter(parameterIdent);
            if (parameter.type === ParameterType.CONTINUOUS) {
                this._ensembleContinuousParameterSet.set(ensemble.getIdent(), parameter);
                minMax = minMax.extendedBy(parameters.getContinuousParameterMinMax(parameterIdent));
            }
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

    hasParameterForEnsemble(ensembleIdent: EnsembleIdent): boolean {
        return this._ensembleContinuousParameterSet.has(ensembleIdent);
    }

    hasParameterRealizationValue(ensembleIdent: EnsembleIdent, realization: number): boolean {
        const parameter = this._ensembleContinuousParameterSet.get(ensembleIdent);
        if (parameter === undefined) return false;

        return parameter.realizations.indexOf(realization) !== -1;
    }

    getParameterRealizationValue(ensembleIdent: EnsembleIdent, realization: number): number {
        if (!this.hasParameterRealizationValue(ensembleIdent, realization)) {
            throw new Error(
                `Parameter ${this.getParameterDisplayName()} has no numerical value for realization ${realization} in ensemble ${ensembleIdent.toString()}`
            );
        }
        const parameter = this._ensembleContinuousParameterSet.get(ensembleIdent);
        if (parameter === undefined) {
            throw new Error(
                `Parameter ${this.getParameterDisplayName()} not found in ensemble ${ensembleIdent.toString()}`
            );
        }
        const realizationIndex = parameter.realizations.indexOf(realization);
        return parameter.values[realizationIndex];
    }
}
