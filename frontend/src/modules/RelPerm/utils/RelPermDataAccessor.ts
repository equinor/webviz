import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

import type {
    RelPermCurveEntry,
    RelPermEnsembleRealizationData,
    RelPermMetric,
    RelPermMetricValue,
} from "../typesAndEnums";

import { calculateRelPermMetric } from "./RelPermMetrics";

export class RelPermDataAccessor {
    private _entries: RelPermCurveEntry[];

    constructor(ensembleData: RelPermEnsembleRealizationData[]) {
        this._entries = makeEntries(ensembleData);
    }

    getEntries(): RelPermCurveEntry[] {
        return this._entries;
    }

    getMetricValues(metric: RelPermMetric): RelPermMetricValue[] {
        const values: RelPermMetricValue[] = [];

        for (const entry of this._entries) {
            const value = calculateRelPermMetric(entry, metric);
            if (value === null || Number.isNaN(value)) {
                continue;
            }

            values.push({
                ensembleIdent: entry.ensembleIdent,
                realization: entry.realization,
                satnum: entry.satnum,
                curveName: entry.curveName,
                value,
            });
        }

        return values;
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
