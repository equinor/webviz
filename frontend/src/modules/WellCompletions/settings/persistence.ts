import { SortDirection, SortWellsBy } from "@webviz/well-completions-plot";

import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { setIfDefined } from "@framework/utils/atomUtils";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { RealizationMode, TimeAggregationFunction } from "../typesAndEnums";

import {
    isZeroCompletionsHiddenAtom,
    realizationModeAtom,
    sortWellsByAtom,
    isTimeAggregationEnabledAtom,
    timeAggregationFunctionAtom,
    wellExclusionTextAtom,
    wellSearchTextAtom,
    wellSortDirectionAtom,
} from "./atoms/baseAtoms";
import {
    selectedCompletionDateIndexAtom,
    selectedCompletionDateIndexRangeAtom,
    selectedEnsembleIdentAtom,
    selectedRealizationAtom,
} from "./atoms/persistableFixableAtoms";

// Optional for backward compat – awaiting schema versioning (#1807)
enum LegacyTimeAggregationMode {
    NONE = "none",
    MAX = "max",
    AVERAGE = "average",
}

export type SerializedSettings = {
    ensembleIdentString: string | null;
    realizationMode: RealizationMode;
    realizationNumber: number | null;
    selectedCompletionDateIndex: number | null;
    selectedCompletionDateIndexRange: { start: number; end: number } | null;
    isZeroCompletionsHidden: boolean;
    wellExclusionText: string;
    wellSearchText: string;
    sortWellsBy: SortWellsBy;
    wellSortDirection: SortDirection;

    // Optional for backward compat – awaiting schema versioning (#1807)
    isTimeAggregationEnabled?: boolean; // New setting
    timeAggregationFunction?: TimeAggregationFunction; // New setting
    timeAggregationMode?: LegacyTimeAggregationMode; // Old setting, only read and never written
};

const schemaBuilder = new SchemaBuilder<SerializedSettings>(() => ({
    properties: {
        ensembleIdentString: { type: "string", nullable: true },
        realizationMode: { enum: Object.values(RealizationMode) },
        realizationNumber: { type: "int16", nullable: true },
        selectedCompletionDateIndex: { type: "int16", nullable: true },
        selectedCompletionDateIndexRange: {
            properties: {
                start: { type: "int16" },
                end: { type: "int16" },
            },
            nullable: true,
        },
        isZeroCompletionsHidden: { type: "boolean" },
        wellExclusionText: { type: "string" },
        wellSearchText: { type: "string" },
        sortWellsBy: { enum: Object.values(SortWellsBy) },
        wellSortDirection: { enum: Object.values(SortDirection) },
    },
    optionalProperties: {
        // Optional for backward compat – awaiting schema versioning (#1807)
        isTimeAggregationEnabled: { type: "boolean" }, // New setting
        timeAggregationFunction: { enum: Object.values(TimeAggregationFunction) }, // New setting
        timeAggregationMode: { enum: Object.values(LegacyTimeAggregationMode) }, // Old setting, only read and never written
    },
}));

export const SERIALIZED_SETTINGS_SCHEMA = schemaBuilder.build();

export const serializeSettings: SerializeStateFunction<SerializedSettings> = (get) => {
    const selectedEnsembleIdentString = get(selectedEnsembleIdentAtom).value?.toString() || null;
    const indexRange = get(selectedCompletionDateIndexRangeAtom).value;
    const formattedDateIndexRange = indexRange ? { start: indexRange[0], end: indexRange[1] } : null;

    return {
        ensembleIdentString: selectedEnsembleIdentString,
        realizationMode: get(realizationModeAtom),
        realizationNumber: get(selectedRealizationAtom).value,
        isTimeAggregationEnabled: get(isTimeAggregationEnabledAtom),
        timeAggregationFunction: get(timeAggregationFunctionAtom),
        selectedCompletionDateIndex: get(selectedCompletionDateIndexAtom).value,
        selectedCompletionDateIndexRange: formattedDateIndexRange,
        isZeroCompletionsHidden: get(isZeroCompletionsHiddenAtom),
        wellExclusionText: get(wellExclusionTextAtom),
        wellSearchText: get(wellSearchTextAtom),
        sortWellsBy: get(sortWellsByAtom),
        wellSortDirection: get(wellSortDirectionAtom),
    };
};
export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    const ensembleIdent = raw.ensembleIdentString ? RegularEnsembleIdent.fromString(raw.ensembleIdentString) : null;
    const completionDateIndexRange: [number, number] | null = raw.selectedCompletionDateIndexRange
        ? [raw.selectedCompletionDateIndexRange.start, raw.selectedCompletionDateIndexRange.end]
        : null;

    setIfDefined(set, selectedEnsembleIdentAtom, ensembleIdent);
    setIfDefined(set, realizationModeAtom, raw.realizationMode);
    setIfDefined(set, selectedRealizationAtom, raw.realizationNumber);
    setIfDefined(set, isTimeAggregationEnabledAtom, raw.isTimeAggregationEnabled);
    setIfDefined(set, timeAggregationFunctionAtom, raw.timeAggregationFunction);
    setIfDefined(set, selectedCompletionDateIndexAtom, raw.selectedCompletionDateIndex);
    setIfDefined(set, selectedCompletionDateIndexRangeAtom, completionDateIndexRange);
    setIfDefined(set, isZeroCompletionsHiddenAtom, raw.isZeroCompletionsHidden);
    setIfDefined(set, wellExclusionTextAtom, raw.wellExclusionText);
    setIfDefined(set, wellSearchTextAtom, raw.wellSearchText);
    setIfDefined(set, sortWellsByAtom, raw.sortWellsBy);
    setIfDefined(set, wellSortDirectionAtom, raw.wellSortDirection);

    // Optional for backward compat – awaiting schema versioning (#1807)
    // Old setting: sessions stored a single mode where "none" meant no aggregation
    if (raw.isTimeAggregationEnabled === undefined && raw.timeAggregationMode !== undefined) {
        const isLegacyAggregated = raw.timeAggregationMode !== LegacyTimeAggregationMode.NONE;
        set(isTimeAggregationEnabledAtom, isLegacyAggregated);
        if (isLegacyAggregated) {
            set(timeAggregationFunctionAtom, raw.timeAggregationMode as unknown as TimeAggregationFunction);
        }
    }
};
