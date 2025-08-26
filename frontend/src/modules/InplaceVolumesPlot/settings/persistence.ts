import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { setIfDefined } from "@framework/utils/atomUtils";
import { IndexValueCriteria } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import type { InplaceVolumesIndexWithValuesAsStrings } from "@modules/_shared/jtd-schemas/definitions/InplaceVolumesIndexWithValues";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { selectedIndexValueCriteriaAtom } from "./atoms/baseAtoms";
import {
    selectedColorByAtom,
    selectedEnsembleIdentsAtom,
    selectedFirstResultNameAtom,
    selectedIndicesWithValuesAtom,
    selectedSecondResultNameAtom,
    selectedSubplotByAtom,
    selectedTableNamesAtom,
} from "./atoms/persistedAtoms";

export type SerializedSettings = {
    ensembleIdents: string[];
    tableNames: string[];
    indicesWithValues: InplaceVolumesIndexWithValuesAsStrings[];
    firstResultName: string | null;
    secondResultName: string | null;
    groupBy: string;
    colorBy: string;

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
        groupBy: { type: "string" },
        colorBy: { type: "string" },

        indexValueCriteria: {
            enum: Object.values(IndexValueCriteria),
        },
    },
}));

export const SERIALIZED_SETTINGS = schemaBuilder.build();

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
        groupBy: get(selectedSubplotByAtom).value,
        colorBy: get(selectedColorByAtom).value,
        indexValueCriteria: get(selectedIndexValueCriteriaAtom),
    };
};

export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    const ensembleIdents = raw.ensembleIdents
        ? raw.ensembleIdents.map((id) => RegularEnsembleIdent.fromString(id))
        : [];
    setIfDefined(set, selectedEnsembleIdentsAtom, ensembleIdents);
    setIfDefined(set, selectedFirstResultNameAtom, raw.firstResultName);
    setIfDefined(set, selectedSecondResultNameAtom, raw.secondResultName);
    setIfDefined(set, selectedSubplotByAtom, raw.groupBy);
    setIfDefined(set, selectedColorByAtom, raw.colorBy);
    setIfDefined(set, selectedIndexValueCriteriaAtom, raw.indexValueCriteria);
    setIfDefined(set, selectedIndicesWithValuesAtom, raw.indicesWithValues);
    setIfDefined(set, selectedTableNamesAtom, raw.tableNames);
};
