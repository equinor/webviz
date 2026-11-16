import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

import type { RelPermCurveEntry, RelPermEnsembleRealizationData } from "../typesAndEnums";

export class RelPermDataAccessor {
    private _entries: RelPermCurveEntry[];

    constructor(ensembleData: RelPermEnsembleRealizationData[]) {
        this._entries = makeEntries(ensembleData);
    }

    getEntries(): RelPermCurveEntry[] {
        return this._entries;
    }
}

function makeEntries(ensembleData: RelPermEnsembleRealizationData[]): RelPermCurveEntry[] {
    const entries: RelPermCurveEntry[] = [];

    for (const item of ensembleData) {
        const saturationValuesBySatnum = new Map(
            item.data.saturation_values_by_satnum.map((item) => [item.satnum, item.saturation_values]),
        );

        for (const realizationData of item.data.realization_data) {
            entries.push(
                ...makeEntriesForRealization(
                    item.ensembleIdent,
                    item.data.saturation_name,
                    saturationValuesBySatnum,
                    realizationData,
                ),
            );
        }
    }

    return entries;
}

function makeEntriesForRealization(
    ensembleIdent: RegularEnsembleIdent,
    saturationName: string,
    saturationValuesBySatnum: Map<number, number[]>,
    realizationData: RelPermEnsembleRealizationData["data"]["realization_data"][number],
): RelPermCurveEntry[] {
    const saturationValues = saturationValuesBySatnum.get(realizationData.satnum) ?? [];

    return realizationData.curve_data.map((curveData) => ({
        ensembleIdent,
        realization: realizationData.realization,
        satnum: realizationData.satnum,
        saturationName,
        saturationValues,
        curveName: curveData.curve_name,
        curveValues: curveData.curve_values,
    }));
}
