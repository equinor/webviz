import { InplaceVolumesStatistic_api } from "@api";
import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { IndexValueCriteria } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import { TableType } from "@modules/_shared/InplaceVolumes/types";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";
import {
    selectedEnsembleIdentsAtom,
    selectedGroupByIndicesAtom,
    selectedIndicesWithValuesAtom,
    selectedResultNamesAtom,
    selectedTableNamesAtom,
} from "./atoms/persistableAtoms";
import { selectedIndexValueCriteriaAtom, selectedStatisticOptionsAtom, selectedTableTypeAtom } from "./atoms/baseAtoms";
import type { InplaceVolumesIndexWithValuesAsStrings } from "@modules/_shared/jtd-schemas/definitions/InplaceVolumesIndexWithValues";
import { setIfDefined } from "@framework/utils/atomUtils";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

export type SerializedSettings = {
    selectedEnsembleIdents: string[];
    selectedTableNames: string[];
    selectedIndicesWithValues: InplaceVolumesIndexWithValuesAsStrings[];
    selectedResultNames: string[];
    selectedGroupByIndices: string[];
    selectedTableType: TableType;
    selectedStatisticOptions: InplaceVolumesStatistic_api[];
    selectedIndexValueCriteria: IndexValueCriteria;
};

const schemaBuilder = new SchemaBuilder<SerializedSettings>(({ inject }) => ({
    properties: {
        selectedEnsembleIdents: {
            elements: {
                type: "string",
            },
        },
        selectedTableNames: {
            elements: {
                type: "string",
            },
        },
        selectedIndicesWithValues: inject("InplaceVolumesIndexWithValues"),
        selectedResultNames: {
            elements: {
                type: "string",
            },
        },
        selectedGroupByIndices: {
            elements: {
                type: "string",
            },
        },
        selectedTableType: {
            enum: [TableType.STATISTICAL, TableType.PER_REALIZATION],
        },
        selectedStatisticOptions: {
            elements: {
                enum: [
                    InplaceVolumesStatistic_api.MAX,
                    InplaceVolumesStatistic_api.MIN,
                    InplaceVolumesStatistic_api.MEAN,
                    InplaceVolumesStatistic_api.STDDEV,
                    InplaceVolumesStatistic_api.P10,
                    InplaceVolumesStatistic_api.P90,
                ],
            },
        },
        selectedIndexValueCriteria: {
            enum: [IndexValueCriteria.REQUIRE_EQUALITY, IndexValueCriteria.ALLOW_INTERSECTION],
        },
    },
}));

export const SERIALIZED_SETTINGS_SCHEMA = schemaBuilder.build();

export const serializeSettings: SerializeStateFunction<SerializedSettings> = (get) => {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);
    const selectedTableNames = get(selectedTableNamesAtom);
    const selectedIndicesWithValues = get(selectedIndicesWithValuesAtom);
    const selectedResultNames = get(selectedResultNamesAtom);
    const selectedGroupByIndices = get(selectedGroupByIndicesAtom);
    const selectedTableType = get(selectedTableTypeAtom);
    const selectedStatisticOptions = get(selectedStatisticOptionsAtom);
    const selectedIndexValueCriteria = get(selectedIndexValueCriteriaAtom);

    const indicesWithStringifiedValues = selectedIndicesWithValues.value.map((index) => ({
        indexColumn: index.indexColumn,
        values: index.values.map((value) => value.toString()),
    }));

    return {
        selectedEnsembleIdents: selectedEnsembleIdents.value.map((ident) => ident.toString()),
        selectedTableNames: selectedTableNames.value,
        selectedIndicesWithValues: indicesWithStringifiedValues,
        selectedResultNames: selectedResultNames.value,
        selectedGroupByIndices: selectedGroupByIndices.value,
        selectedTableType: selectedTableType,
        selectedStatisticOptions: selectedStatisticOptions,
        selectedIndexValueCriteria: selectedIndexValueCriteria,
    };
};

export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    setIfDefined(
        set,
        selectedEnsembleIdentsAtom,
        raw.selectedEnsembleIdents?.map((ident) => RegularEnsembleIdent.fromString(ident)),
    );
    setIfDefined(set, selectedTableNamesAtom, raw.selectedTableNames);
    setIfDefined(set, selectedIndicesWithValuesAtom, raw.selectedIndicesWithValues);
    setIfDefined(set, selectedResultNamesAtom, raw.selectedResultNames);
    setIfDefined(set, selectedGroupByIndicesAtom, raw.selectedGroupByIndices);
    setIfDefined(set, selectedTableTypeAtom, raw.selectedTableType);
    setIfDefined(set, selectedStatisticOptionsAtom, raw.selectedStatisticOptions);
    setIfDefined(set, selectedIndexValueCriteriaAtom, raw.selectedIndexValueCriteria);
};
