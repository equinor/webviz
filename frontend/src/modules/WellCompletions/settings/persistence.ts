import { SortDirection, SortWellsBy } from "@webviz/well-completions-plot";

import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { setIfDefined } from "@framework/utils/atomUtils";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { RealizationMode, TimeAggregationMode } from "../typesAndEnums";

import {
    isZeroCompletionsHiddenAtom,
    realizationModeAtom,
    sortWellsByAtom,
    timeAggregationModeAtom,
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

export type SerializedSettings = {
    ensembleIdentString: string | null;
    realizationMode: RealizationMode;
    realizationNumber: number | null;
    timeAggregationMode: TimeAggregationMode;
    selectedCompletionDateIndex: number | null;
    selectedCompletionDateIndexRange: { start: number; end: number } | null;
    isZeroCompletionsHidden: boolean;
    wellExclusionText: string;
    wellSearchText: string;
    sortWellsBy: SortWellsBy;
    wellSortDirection: SortDirection;
};

const schemaBuilder = new SchemaBuilder<SerializedSettings>(() => ({
    properties: {
        ensembleIdentString: { type: "string", nullable: true },
        realizationMode: { enum: Object.values(RealizationMode) },
        realizationNumber: { type: "int16", nullable: true },
        timeAggregationMode: { enum: Object.values(TimeAggregationMode) },
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
        timeAggregationMode: get(timeAggregationModeAtom),
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
    setIfDefined(set, timeAggregationModeAtom, raw.timeAggregationMode);
    setIfDefined(set, selectedCompletionDateIndexAtom, raw.selectedCompletionDateIndex);
    setIfDefined(set, selectedCompletionDateIndexRangeAtom, completionDateIndexRange);
    setIfDefined(set, isZeroCompletionsHiddenAtom, raw.isZeroCompletionsHidden);
    setIfDefined(set, wellExclusionTextAtom, raw.wellExclusionText);
    setIfDefined(set, wellSearchTextAtom, raw.wellSearchText);
    setIfDefined(set, sortWellsByAtom, raw.sortWellsBy);
    setIfDefined(set, wellSortDirectionAtom, raw.wellSortDirection);
};
