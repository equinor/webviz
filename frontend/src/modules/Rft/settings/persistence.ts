import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { setIfDefined } from "@framework/utils/atomUtils";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { RftStatistic } from "../typesAndEnums";

import {
    selectedStatisticsAtom,
    showIndividualRealizationsAtom,
    showObservationsAtom,
    showStatisticalFanAtom,
    showStatisticalLinesAtom,
} from "./atoms/baseAtoms";
import {
    userSelectedEnsembleIdentsAtom,
    userSelectedResponseNameAtom,
    userSelectedTimestampUtcMsAtom,
    userSelectedWellNameAtom,
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
    },
}));

export const SERIALIZED_SETTINGS_SCHEMA = schemaBuilder.build();

export const serializeSettings: SerializeStateFunction<SerializedSettings> = (get) => ({
    selectedEnsembleIdentStrings: get(userSelectedEnsembleIdentsAtom).value.map((ensembleIdent) =>
        ensembleIdent.toString(),
    ),
    selectedResponseName: get(userSelectedResponseNameAtom).value,
    selectedWellName: get(userSelectedWellNameAtom).value,
    selectedTimestampUtcMs: get(userSelectedTimestampUtcMsAtom).value,
    showIndividualRealizations: get(showIndividualRealizationsAtom),
    showStatisticalLines: get(showStatisticalLinesAtom),
    showStatisticalFan: get(showStatisticalFanAtom),
    showObservations: get(showObservationsAtom),
    selectedStatistics: get(selectedStatisticsAtom),
});

export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    setIfDefined(
        set,
        userSelectedEnsembleIdentsAtom,
        raw.selectedEnsembleIdentStrings?.map((ensembleIdentString) =>
            RegularEnsembleIdent.fromString(ensembleIdentString),
        ),
    );
    setIfDefined(set, userSelectedResponseNameAtom, raw.selectedResponseName);
    setIfDefined(set, userSelectedWellNameAtom, raw.selectedWellName);
    setIfDefined(set, userSelectedTimestampUtcMsAtom, raw.selectedTimestampUtcMs);
    setIfDefined(set, showIndividualRealizationsAtom, raw.showIndividualRealizations);
    setIfDefined(set, showStatisticalLinesAtom, raw.showStatisticalLines);
    setIfDefined(set, showStatisticalFanAtom, raw.showStatisticalFan);
    setIfDefined(set, showObservationsAtom, raw.showObservations);
    setIfDefined(set, selectedStatisticsAtom, raw.selectedStatistics);
};
