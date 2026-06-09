import type { RftEnsembleRealizationData, RftRealizationCurve } from "../typesAndEnums";

export class RftDataAccessor {
    private _entries: RftRealizationCurve[];

    constructor(ensembleData: RftEnsembleRealizationData[]) {
        this._entries = makeEntries(ensembleData);
    }

    getEntries(): RftRealizationCurve[] {
        return this._entries;
    }
}

function makeEntries(ensembleData: RftEnsembleRealizationData[]): RftRealizationCurve[] {
    const entries: RftRealizationCurve[] = [];

    for (const item of ensembleData) {
        for (const realizationData of item.data) {
            const { depths, values } = sortCurveByDepth(realizationData.depth_arr, realizationData.value_arr);
            entries.push({
                ensembleIdent: item.ensembleIdent,
                realization: realizationData.realization,
                depths,
                values,
            });
        }
    }

    return entries;
}

function sortCurveByDepth(depths: number[], values: number[]): { depths: number[]; values: number[] } {
    const orderedIndices = depths.map((_, index) => index).sort((left, right) => depths[left] - depths[right]);
    return {
        depths: orderedIndices.map((index) => depths[index]),
        values: orderedIndices.map((index) => values[index]),
    };
}
