import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { setIfDefined } from "@framework/utils/atomUtils";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { PlotDimension, RegionSelectionMode, StatisticsType, VisualizationMode } from "../typesAndEnums";

import {
    colorByAtom,
    regionSelectionModeAtom,
    selectedStatisticsAtom,
    subplotByAtom,
    visualizationModeAtom,
} from "./atoms/baseAtoms";
import {
    selectedEnsembleIdentsAtom,
    selectedFipArrayAtom,
    selectedRegionNamesAtom,
    selectedRegionsAtom,
    selectedVectorBaseNameAtom,
    selectedZoneNamesAtom,
} from "./atoms/persistableFixableAtoms";

export type SerializedSettings = {
    ensembleIdentStrings: string[];
    vectorBaseName: string | null;
    fipArray: string | null;
    selectedRegions: number[];
    regionSelectionMode: RegionSelectionMode;
    selectedZoneNames: string[];
    selectedRegionNames: string[];
    visualizationMode: VisualizationMode;
    colorBy: PlotDimension;
    subplotBy: PlotDimension | null;
    selectedStatistics: StatisticsType[];
};

const schemaBuilder = new SchemaBuilder<SerializedSettings>(() => ({
    properties: {
        ensembleIdentStrings: {
            elements: { type: "string" },
        },
        vectorBaseName: { type: "string", nullable: true },
        fipArray: { type: "string", nullable: true },
        selectedRegions: {
            elements: { type: "int32" },
        },
        regionSelectionMode: {
            enum: Object.values(RegionSelectionMode),
        },
        selectedZoneNames: {
            elements: { type: "string" },
        },
        selectedRegionNames: {
            elements: { type: "string" },
        },
        visualizationMode: {
            enum: Object.values(VisualizationMode),
        },
        colorBy: {
            enum: Object.values(PlotDimension),
        },
        subplotBy: {
            enum: Object.values(PlotDimension),
            nullable: true,
        },
        selectedStatistics: {
            elements: {
                enum: Object.values(StatisticsType),
            },
        },
    },
}));

export const SERIALIZED_SETTINGS_SCHEMA = schemaBuilder.build();

export const serializeSettings: SerializeStateFunction<SerializedSettings> = (get) => {
    return {
        ensembleIdentStrings: get(selectedEnsembleIdentsAtom).value.map((ident) => ident.toString()),
        vectorBaseName: get(selectedVectorBaseNameAtom).value,
        fipArray: get(selectedFipArrayAtom).value,
        selectedRegions: get(selectedRegionsAtom).value,
        regionSelectionMode: get(regionSelectionModeAtom),
        selectedZoneNames: get(selectedZoneNamesAtom).value,
        selectedRegionNames: get(selectedRegionNamesAtom).value,
        visualizationMode: get(visualizationModeAtom),
        colorBy: get(colorByAtom),
        subplotBy: get(subplotByAtom),
        selectedStatistics: get(selectedStatisticsAtom),
    };
};

export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    const ensembleIdents = raw.ensembleIdentStrings
        ? raw.ensembleIdentStrings.map((id) => RegularEnsembleIdent.fromString(id))
        : undefined;
    setIfDefined(set, selectedEnsembleIdentsAtom, ensembleIdents);
    setIfDefined(set, selectedVectorBaseNameAtom, raw.vectorBaseName);
    setIfDefined(set, selectedFipArrayAtom, raw.fipArray);
    setIfDefined(set, selectedRegionsAtom, raw.selectedRegions);
    setIfDefined(set, regionSelectionModeAtom, raw.regionSelectionMode);
    setIfDefined(set, selectedZoneNamesAtom, raw.selectedZoneNames);
    setIfDefined(set, selectedRegionNamesAtom, raw.selectedRegionNames);
    setIfDefined(set, visualizationModeAtom, raw.visualizationMode);
    setIfDefined(set, colorByAtom, raw.colorBy);
    setIfDefined(set, subplotByAtom, raw.subplotBy);
    setIfDefined(set, selectedStatisticsAtom, raw.selectedStatistics);
};
