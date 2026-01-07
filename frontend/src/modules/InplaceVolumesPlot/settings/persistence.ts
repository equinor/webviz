import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { setIfDefined } from "@framework/utils/atomUtils";
import { IndexValueCriteria } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import type { InplaceVolumesIndexWithValuesAsStrings } from "@modules/_shared/jtd-schemas/definitions/InplaceVolumesIndexWithValues";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { PlotType, type InplaceVolumesPlotOptions } from "../typesAndEnums";

import {
    plotOptionsAtom,
    selectedIndexValueCriteriaAtom,
    selectedPlotTypeAtom,
    showTableAtom,
} from "./atoms/baseAtoms";
import {
    selectedColorByAtom,
    selectedEnsembleIdentsAtom,
    selectedFirstResultNameAtom,
    selectedIndicesWithValuesAtom,
    selectedSelectorColumnAtom,
    selectedSubplotByAtom,
    selectedTableNamesAtom,
} from "./atoms/persistableFixableAtoms";

export type SerializedSettings = {
    ensembleIdentStrings: string[];
    tableNames: string[];
    indicesWithValues: InplaceVolumesIndexWithValuesAsStrings[];
    firstResultName: string | null;
    selectorColumn: string | null;
    groupBy: string;
    colorBy: string;
    plotType: PlotType;
    plotOptions: InplaceVolumesPlotOptions;
    indexValueCriteria: IndexValueCriteria;
    showTable: boolean;
};

const schemaBuilder = new SchemaBuilder<SerializedSettings>(({ inject }) => ({
    properties: {
        ensembleIdentStrings: {
            elements: { type: "string" },
        },
        tableNames: {
            elements: { type: "string" },
        },
        indicesWithValues: {
            ...inject("InplaceVolumesIndexWithValues"),
        },
        firstResultName: { type: "string", nullable: true },
        selectorColumn: { type: "string", nullable: true },
        groupBy: { type: "string" },
        colorBy: { type: "string" },

        indexValueCriteria: {
            enum: Object.values(IndexValueCriteria),
        },
        plotType: {
            enum: Object.values(PlotType),
        },
        plotOptions: {
            ...inject("InplaceVolumesPlotOptions"),
        },
        showTable: { type: "boolean" },
    },
}));

export const SERIALIZED_SETTINGS_SCHEMA = schemaBuilder.build();

export const serializeSettings: SerializeStateFunction<SerializedSettings> = (get) => {
    const selectedEnsembleIdentStrings = get(selectedEnsembleIdentsAtom).value.map((ident) => ident.toString());
    const indicesWithStringifiedValues = get(selectedIndicesWithValuesAtom).value.map((index) => ({
        indexColumn: index.indexColumn,
        values: index.values.map((value) => value.toString()),
    }));
    return {
        ensembleIdentStrings: selectedEnsembleIdentStrings,
        tableNames: get(selectedTableNamesAtom).value,
        indicesWithValues: indicesWithStringifiedValues,
        firstResultName: get(selectedFirstResultNameAtom).value,
        selectorColumn: get(selectedSelectorColumnAtom).value,
        groupBy: get(selectedSubplotByAtom).value,
        colorBy: get(selectedColorByAtom).value,
        indexValueCriteria: get(selectedIndexValueCriteriaAtom),
        plotType: get(selectedPlotTypeAtom),
        plotOptions: get(plotOptionsAtom),
        showTable: get(showTableAtom),
    };
};

export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    const ensembleIdents = raw.ensembleIdentStrings
        ? raw.ensembleIdentStrings.map((id) => RegularEnsembleIdent.fromString(id))
        : undefined;
    setIfDefined(set, selectedEnsembleIdentsAtom, ensembleIdents);
    setIfDefined(set, selectedFirstResultNameAtom, raw.firstResultName);
    setIfDefined(set, selectedSelectorColumnAtom, raw.selectorColumn);
    setIfDefined(set, selectedSubplotByAtom, raw.groupBy);
    setIfDefined(set, selectedColorByAtom, raw.colorBy);
    setIfDefined(set, selectedIndexValueCriteriaAtom, raw.indexValueCriteria);
    setIfDefined(set, selectedIndicesWithValuesAtom, raw.indicesWithValues);
    setIfDefined(set, selectedTableNamesAtom, raw.tableNames);
    setIfDefined(set, selectedPlotTypeAtom, raw.plotType);
    setIfDefined(set, plotOptionsAtom, raw.plotOptions);
    setIfDefined(set, showTableAtom, raw.showTable);
};
