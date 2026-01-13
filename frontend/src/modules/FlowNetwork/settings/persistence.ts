import { Frequency_api, NodeType_api } from "@api";
import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { setIfDefined } from "@framework/utils/atomUtils";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { selectedNodeTypesAtom, selectedResamplingFrequencyAtom } from "./atoms/baseAtoms";
import {
    selectedDateTimeAtom,
    selectedEdgeKeyAtom,
    selectedEnsembleIdentAtom,
    selectedNodeKeyAtom,
    selectedRealizationAtom,
    selectedTreeTypeAtom,
} from "./atoms/persistableFixableAtoms";

export type SerializedSettings = {
    ensembleIdentString: string | null;
    resamplingFrequency: Frequency_api;
    selectedRealization: number | null;
    selectedTreeType: string | null;
    selectedNodeTypes: NodeType_api[];
    selectedEdgeKey: string | null;
    selectedNodeKey: string | null;
    selectedDateTime: string | null;
};

const schemaBuilder = new SchemaBuilder<SerializedSettings>(() => ({
    properties: {
        ensembleIdentString: { type: "string", nullable: true },
        resamplingFrequency: { enum: Object.values(Frequency_api) },
        selectedRealization: { type: "int16", nullable: true },
        selectedTreeType: { type: "string", nullable: true },
        selectedNodeTypes: { elements: { enum: Object.values(NodeType_api) } },
        selectedEdgeKey: { type: "string", nullable: true },
        selectedNodeKey: { type: "string", nullable: true },
        selectedDateTime: { type: "string", nullable: true },
    },
}));

export const SERIALIZED_SETTINGS_SCHEMA = schemaBuilder.build();

export const serializeSettings: SerializeStateFunction<SerializedSettings> = (get) => {
    const selectedEnsembleIdentString = get(selectedEnsembleIdentAtom).value?.toString() || null;
    const selectedNodeTypesArray = [...get(selectedNodeTypesAtom)];

    return {
        ensembleIdentString: selectedEnsembleIdentString,
        resamplingFrequency: get(selectedResamplingFrequencyAtom),
        selectedRealization: get(selectedRealizationAtom).value,
        selectedTreeType: get(selectedTreeTypeAtom).value,
        selectedNodeTypes: selectedNodeTypesArray,
        selectedEdgeKey: get(selectedEdgeKeyAtom).value,
        selectedNodeKey: get(selectedNodeKeyAtom).value,
        selectedDateTime: get(selectedDateTimeAtom).value,
    };
};

export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    const ensembleIdent = raw.ensembleIdentString ? RegularEnsembleIdent.fromString(raw.ensembleIdentString) : null;
    const selectedNodeTypesSet = new Set(raw.selectedNodeTypes);

    setIfDefined(set, selectedEnsembleIdentAtom, ensembleIdent);
    setIfDefined(set, selectedResamplingFrequencyAtom, raw.resamplingFrequency);
    setIfDefined(set, selectedRealizationAtom, raw.selectedRealization);
    setIfDefined(set, selectedNodeTypesAtom, selectedNodeTypesSet);
    setIfDefined(set, selectedEdgeKeyAtom, raw.selectedEdgeKey);
    setIfDefined(set, selectedNodeKeyAtom, raw.selectedNodeKey);
    setIfDefined(set, selectedDateTimeAtom, raw.selectedDateTime);
};
