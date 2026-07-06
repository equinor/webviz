import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

import type { RftEnsembleRealizationData, RftRealizationCurve } from "../typesAndEnums";

import { sortCurveByDepth } from "./curveUtils";

export class RftDataAccessor {
    private _entries: RftRealizationCurve[];
    private _ensembleIdents: RegularEnsembleIdent[];

    constructor(ensembleData: RftEnsembleRealizationData[]) {
        this._entries = makeEntries(ensembleData);
        // The input is already grouped per ensemble, so the idents are unique and order-preserving here.
        this._ensembleIdents = ensembleData.map(function getEnsembleIdent(item) {
            return item.ensembleIdent;
        });
    }

    getEntries(): readonly RftRealizationCurve[] {
        return this._entries;
    }

    getEnsembleIdents(): readonly RegularEnsembleIdent[] {
        return this._ensembleIdents;
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
