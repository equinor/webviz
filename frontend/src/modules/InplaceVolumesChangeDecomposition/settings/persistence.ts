import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { setIfDefined } from "@framework/utils/atomUtils";
import { IndexValueCriteria } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import type { InplaceVolumesIndexWithValuesAsStrings } from "@modules/_shared/jtd-schemas/definitions/InplaceVolumesIndexWithValues";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import {
    selectedIndexValueCriteriaAtom,
    userSelectedComparisonEnsembleIdentAtom,
    userSelectedIndicesWithValuesAtom,
    userSelectedReferenceEnsembleIdentAtom,
    userSelectedResultNameAtom,
    userSelectedSubplotByAtom,
    userSelectedTableNameAtom,
} from "./atoms/baseAtoms";

export type SerializedSettings = {
    referenceEnsembleIdentString: string | null;
    comparisonEnsembleIdentString: string | null;
    tableName: string | null;
    resultName: string | null;
    subplotBy: string | null;
    indicesWithValues: InplaceVolumesIndexWithValuesAsStrings[];
    indexValueCriteria: IndexValueCriteria;
};

const schemaBuilder = new SchemaBuilder<SerializedSettings>(({ inject }) => ({
    properties: {
        referenceEnsembleIdentString: { type: "string", nullable: true },
        comparisonEnsembleIdentString: { type: "string", nullable: true },
        tableName: { type: "string", nullable: true },
        resultName: { type: "string", nullable: true },
        subplotBy: { type: "string", nullable: true },
        indicesWithValues: { ...inject("InplaceVolumesIndexWithValues") },
        indexValueCriteria: { enum: Object.values(IndexValueCriteria) },
    },
}));

export const SERIALIZED_SETTINGS_SCHEMA = schemaBuilder.build();

export const serializeSettings: SerializeStateFunction<SerializedSettings> = (get) => {
    return {
        referenceEnsembleIdentString: get(userSelectedReferenceEnsembleIdentAtom)?.toString() ?? null,
        comparisonEnsembleIdentString: get(userSelectedComparisonEnsembleIdentAtom)?.toString() ?? null,
        tableName: get(userSelectedTableNameAtom),
        resultName: get(userSelectedResultNameAtom),
        subplotBy: get(userSelectedSubplotByAtom),
        indicesWithValues: get(userSelectedIndicesWithValuesAtom).map((index) => ({
            indexColumn: index.indexColumn,
            values: index.values.map((value) => value.toString()),
        })),
        indexValueCriteria: get(selectedIndexValueCriteriaAtom),
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
    setIfDefined(
        set,
        userSelectedReferenceEnsembleIdentAtom,
        parseRegularEnsembleIdent(raw.referenceEnsembleIdentString),
    );
    setIfDefined(
        set,
        userSelectedComparisonEnsembleIdentAtom,
        parseRegularEnsembleIdent(raw.comparisonEnsembleIdentString),
    );
    setIfDefined(set, userSelectedTableNameAtom, raw.tableName);
    setIfDefined(set, userSelectedResultNameAtom, raw.resultName);
    setIfDefined(set, userSelectedSubplotByAtom, raw.subplotBy);
    setIfDefined(set, userSelectedIndicesWithValuesAtom, raw.indicesWithValues);
    setIfDefined(set, selectedIndexValueCriteriaAtom, raw.indexValueCriteria);
};
