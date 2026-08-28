import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { setIfDefined } from "@framework/utils/atomUtils";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { RftStatistic } from "../typesAndEnums";

import {
    dataChannelDepthAtom,
    selectedStatisticsAtom,
    showDepthLineAtom,
    showIndividualRealizationsAtom,
    showObservationsAtom,
    showStatisticalFanAtom,
    showStatisticalLinesAtom,
} from "./atoms/baseAtoms";
import {
    selectedEnsembleIdentsAtom,
    selectedResponseNameAtom,
    selectedTimestampUtcMsAtom,
    selectedWellNameAtom,
} from "./atoms/persistableFixableAtoms";

export type SerializedSettings = {
    selectedEnsembleIdentStrings: string[];
    selectedResponseName: string | null;
    selectedWellName: string | null;
    selectedTimestampUtcMs: number | null;
    showIndividualRealizations: boolean;
    showStatisticalLines: boolean;
    showStatisticalFan: boolean;
    showObservations: boolean;
    selectedStatistics: RftStatistic[];
    dataChannelDepth: number | null;
    showDepthLine: boolean;
};

const schemaBuilder = new SchemaBuilder<SerializedSettings>(() => ({
    properties: {
        selectedEnsembleIdentStrings: { elements: { type: "string" } },
        selectedResponseName: { type: "string", nullable: true },
        selectedWellName: { type: "string", nullable: true },
        selectedTimestampUtcMs: { type: "float64", nullable: true },
        showIndividualRealizations: { type: "boolean" },
        showStatisticalLines: { type: "boolean" },
        showStatisticalFan: { type: "boolean" },
        showObservations: { type: "boolean" },
        selectedStatistics: { elements: { enum: Object.values(RftStatistic) } },
        dataChannelDepth: { type: "float64", nullable: true },
        showDepthLine: { type: "boolean" },
    },
}));

export const SERIALIZED_SETTINGS_SCHEMA = schemaBuilder.build();

export const serializeSettings: SerializeStateFunction<SerializedSettings> = (get) => ({
    selectedEnsembleIdentStrings: get(selectedEnsembleIdentsAtom).value.map((ensembleIdent) =>
        ensembleIdent.toString(),
    ),
    selectedResponseName: get(selectedResponseNameAtom).value,
    selectedWellName: get(selectedWellNameAtom).value,
    selectedTimestampUtcMs: get(selectedTimestampUtcMsAtom).value,
    showIndividualRealizations: get(showIndividualRealizationsAtom),
    showStatisticalLines: get(showStatisticalLinesAtom),
    showStatisticalFan: get(showStatisticalFanAtom),
    showObservations: get(showObservationsAtom),
    selectedStatistics: get(selectedStatisticsAtom),
    dataChannelDepth: get(dataChannelDepthAtom),
    showDepthLine: get(showDepthLineAtom),
});

export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    setIfDefined(
        set,
        selectedEnsembleIdentsAtom,
        raw.selectedEnsembleIdentStrings?.flatMap((ensembleIdentString) => {
            try {
                return [RegularEnsembleIdent.fromString(ensembleIdentString)];
            } catch {
                return [];
            }
        }),
    );
    setIfDefined(set, selectedResponseNameAtom, raw.selectedResponseName);
    setIfDefined(set, selectedWellNameAtom, raw.selectedWellName);
    setIfDefined(set, selectedTimestampUtcMsAtom, raw.selectedTimestampUtcMs);
    setIfDefined(set, showIndividualRealizationsAtom, raw.showIndividualRealizations);
    setIfDefined(set, showStatisticalLinesAtom, raw.showStatisticalLines);
    setIfDefined(set, showStatisticalFanAtom, raw.showStatisticalFan);
    setIfDefined(set, showObservationsAtom, raw.showObservations);
    setIfDefined(set, selectedStatisticsAtom, raw.selectedStatistics);
    setIfDefined(set, dataChannelDepthAtom, raw.dataChannelDepth);
    setIfDefined(set, showDepthLineAtom, raw.showDepthLine);
};
