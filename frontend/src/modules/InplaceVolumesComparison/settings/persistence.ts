import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { setIfDefined } from "@framework/utils/atomUtils";
import { IndexValueCriteria } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import type { InplaceVolumesIndexWithValuesAsStrings } from "@modules/_shared/jtd-schemas/definitions/InplaceVolumesIndexWithValues";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { selectedIndexValueCriteriaAtom, showTableAtom } from "./atoms/baseAtoms";
import {
    selectedComparisonEnsembleIdentAtom,
    selectedComparisonSensitivityCaseAtom,
    selectedComparisonTableNameAtom,
    selectedIndicesWithValuesAtom,
    selectedReferenceEnsembleIdentAtom,
    selectedReferenceSensitivityCaseAtom,
    selectedReferenceTableNameAtom,
    selectedResultNameAtom,
    selectedSubplotByAtom,
} from "./atoms/persistableFixableAtoms";

type SerializedSensitivityCase = { sensitivityName: string; caseName: string } | null;

export type SerializedSettings = {
    referenceEnsembleIdentString: string | null;
    comparisonEnsembleIdentString: string | null;
    referenceTableName: string | null;
    comparisonTableName: string | null;
    resultName: string | null;
    subplotBy: string | null;
    indicesWithValues: InplaceVolumesIndexWithValuesAsStrings[];
    indexValueCriteria: IndexValueCriteria;
    showTable: boolean;
    referenceSensitivityCase?: SerializedSensitivityCase;
    comparisonSensitivityCase?: SerializedSensitivityCase;
};

const SENSITIVITY_CASE_SCHEMA = {
    properties: {
        sensitivityName: { type: "string" },
        caseName: { type: "string" },
    },
    nullable: true,
} as const;

const schemaBuilder = new SchemaBuilder<SerializedSettings>(({ inject }) => ({
    properties: {
        referenceEnsembleIdentString: { type: "string", nullable: true },
        comparisonEnsembleIdentString: { type: "string", nullable: true },
        referenceTableName: { type: "string", nullable: true },
        comparisonTableName: { type: "string", nullable: true },
        resultName: { type: "string", nullable: true },
        subplotBy: { type: "string", nullable: true },
        indicesWithValues: { ...inject("InplaceVolumesIndexWithValues") },
        indexValueCriteria: { enum: Object.values(IndexValueCriteria) },
        showTable: { type: "boolean" },
    },
    optionalProperties: {
        referenceSensitivityCase: SENSITIVITY_CASE_SCHEMA,
        comparisonSensitivityCase: SENSITIVITY_CASE_SCHEMA,
    },
}));

export const SERIALIZED_SETTINGS_SCHEMA = schemaBuilder.build();

export const serializeSettings: SerializeStateFunction<SerializedSettings> = (get) => {
    return {
        referenceEnsembleIdentString: get(selectedReferenceEnsembleIdentAtom).value?.toString() ?? null,
        comparisonEnsembleIdentString: get(selectedComparisonEnsembleIdentAtom).value?.toString() ?? null,
        referenceTableName: get(selectedReferenceTableNameAtom).value,
        comparisonTableName: get(selectedComparisonTableNameAtom).value,
        resultName: get(selectedResultNameAtom).value,
        subplotBy: get(selectedSubplotByAtom).value,
        indicesWithValues: get(selectedIndicesWithValuesAtom).value.map((index) => ({
            indexColumn: index.indexColumn,
            values: index.values.map((value) => value.toString()),
        })),
        indexValueCriteria: get(selectedIndexValueCriteriaAtom),
        showTable: get(showTableAtom),
        referenceSensitivityCase: get(selectedReferenceSensitivityCaseAtom).value,
        comparisonSensitivityCase: get(selectedComparisonSensitivityCaseAtom).value,
    };
};

function parseRegularEnsembleIdent(identString: string | null | undefined): RegularEnsembleIdent | null | undefined {
    if (identString === undefined) {
        return undefined;
    }
    if (identString === null || !RegularEnsembleIdent.isValidEnsembleIdentString(identString)) {
        return null;
    }
    return RegularEnsembleIdent.fromString(identString);
}

export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    setIfDefined(set, selectedReferenceEnsembleIdentAtom, parseRegularEnsembleIdent(raw.referenceEnsembleIdentString));
    setIfDefined(
        set,
        selectedComparisonEnsembleIdentAtom,
        parseRegularEnsembleIdent(raw.comparisonEnsembleIdentString),
    );
    setIfDefined(set, selectedReferenceTableNameAtom, raw.referenceTableName);
    setIfDefined(set, selectedComparisonTableNameAtom, raw.comparisonTableName);
    setIfDefined(set, selectedResultNameAtom, raw.resultName);
    setIfDefined(set, selectedSubplotByAtom, raw.subplotBy);
    setIfDefined(set, selectedIndicesWithValuesAtom, raw.indicesWithValues);
    setIfDefined(set, selectedIndexValueCriteriaAtom, raw.indexValueCriteria);
    setIfDefined(set, showTableAtom, raw.showTable);
    setIfDefined(set, selectedReferenceSensitivityCaseAtom, raw.referenceSensitivityCase);
    setIfDefined(set, selectedComparisonSensitivityCaseAtom, raw.comparisonSensitivityCase);
};
