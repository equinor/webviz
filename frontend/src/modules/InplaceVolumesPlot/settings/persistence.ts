import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { setIfDefined } from "@framework/utils/atomUtils";
import { IndexValueCriteria } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import type { InplaceVolumesIndexWithValuesAsStrings } from "@modules/_shared/jtd-schemas/definitions/InplaceVolumesIndexWithValues";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { PlotType } from "../typesAndEnums";

import { selectedIndexValueCriteriaAtom, selectedPlotTypeAtom } from "./atoms/baseAtoms";
import {
    selectedColorByAtom,
    selectedEnsembleIdentsAtom,
    selectedFirstResultNameAtom,
    selectedIndicesWithValuesAtom,
    selectedSecondResultNameAtom,
    selectedSelectorColumnAtom,
    selectedSubplotByAtom,
    selectedTableNamesAtom,
} from "./atoms/persistedAtoms";

export type SerializedSettings = {
    ensembleIdents: string[];
    tableNames: string[];
    indicesWithValues: InplaceVolumesIndexWithValuesAsStrings[];
    firstResultName: string | null;
    secondResultName: string | null;
    selectorColumn: string | null;
    groupBy: string;
    colorBy: string;
    plotType: PlotType;

    indexValueCriteria: IndexValueCriteria;
};

const schemaBuilder = new SchemaBuilder<SerializedSettings>(({ inject }) => ({
    properties: {
        ensembleIdents: {
            elements: { type: "string" },
        },
        tableNames: {
            elements: { type: "string" },
        },
        indicesWithValues: {
            ...inject("InplaceVolumesIndexWithValues"),
        },
        firstResultName: { type: "string", nullable: true },
        secondResultName: { type: "string", nullable: true },
        selectorColumn: { type: "string", nullable: true },
        groupBy: { type: "string" },
        colorBy: { type: "string" },

        indexValueCriteria: {
            enum: Object.values(IndexValueCriteria),
        },
        plotType: {
            enum: Object.values(PlotType),
        },
    },
}));

export const SERIALIZED_SETTINGS_SCHEMA = schemaBuilder.build();

export const serializeSettings: SerializeStateFunction<SerializedSettings> = (get) => {
    const selectedEnsembleIdentsString = get(selectedEnsembleIdentsAtom).value.map((ident) => ident.toString());
    const indicesWithStringifiedValues = get(selectedIndicesWithValuesAtom).value.map((index) => ({
        indexColumn: index.indexColumn,
        values: index.values.map((value) => value.toString()),
    }));
    return {
        ensembleIdents: selectedEnsembleIdentsString,
        tableNames: get(selectedTableNamesAtom).value,
        indicesWithValues: indicesWithStringifiedValues,
        firstResultName: get(selectedFirstResultNameAtom).value,
        secondResultName: get(selectedSecondResultNameAtom).value,
        selectorColumn: get(selectedSelectorColumnAtom).value,
        groupBy: get(selectedSubplotByAtom).value,
        colorBy: get(selectedColorByAtom).value,
        indexValueCriteria: get(selectedIndexValueCriteriaAtom),
        plotType: get(selectedPlotTypeAtom),
    };
};

export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    const ensembleIdents = raw.ensembleIdents
        ? raw.ensembleIdents.map((id) => RegularEnsembleIdent.fromString(id))
        : [];
    setIfDefined(set, selectedEnsembleIdentsAtom, ensembleIdents);
    setIfDefined(set, selectedFirstResultNameAtom, raw.firstResultName);
    setIfDefined(set, selectedSecondResultNameAtom, raw.secondResultName);
    setIfDefined(set, selectedSelectorColumnAtom, raw.selectorColumn);
    setIfDefined(set, selectedSubplotByAtom, raw.groupBy);
    setIfDefined(set, selectedColorByAtom, raw.colorBy);
    setIfDefined(set, selectedIndexValueCriteriaAtom, raw.indexValueCriteria);
    setIfDefined(set, selectedIndicesWithValuesAtom, raw.indicesWithValues);
    setIfDefined(set, selectedTableNamesAtom, raw.tableNames);
    setIfDefined(set, selectedPlotTypeAtom, raw.plotType);
};
