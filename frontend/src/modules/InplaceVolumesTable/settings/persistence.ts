import { InplaceVolumesStatistic_api } from "@api";
import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { setIfDefined } from "@framework/utils/atomUtils";
import { getEnsembleIdentsFromStrings } from "@framework/utils/ensembleIdentUtils";
import { IndexValueCriteria } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import { TableType } from "@modules/_shared/InplaceVolumes/types";
import type { InplaceVolumesIndexWithValuesAsStrings } from "@modules/_shared/jtd-schemas/definitions/InplaceVolumesIndexWithValues";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { StatisticsLayout } from "../types";

import {
    selectedIndexValueCriteriaAtom,
    selectedStatisticOptionsAtom,
    selectedStatisticsLayoutAtom,
    selectedTableTypeAtom,
} from "./atoms/baseAtoms";
import {
    selectedEnsembleIdentsAtom,
    selectedGroupByIndicesAtom,
    selectedIndicesWithValuesAtom,
    selectedResultNamesAtom,
    selectedTableNamesAtom,
} from "./atoms/persistableFixableAtoms";

export type SerializedSettings = {
    selectedEnsembleIdentStrings: string[];
    selectedTableNames: string[];
    selectedIndicesWithValues: InplaceVolumesIndexWithValuesAsStrings[];
    selectedResultNames: string[];
    selectedGroupByIndices: string[];
    selectedTableType: TableType;
    selectedStatisticOptions: InplaceVolumesStatistic_api[];
    selectedStatisticsLayout?: StatisticsLayout;
    selectedIndexValueCriteria: IndexValueCriteria;
};

const schemaBuilder = new SchemaBuilder<SerializedSettings>(({ inject }) => ({
    properties: {
        selectedEnsembleIdentStrings: {
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
            enum: Object.values(TableType),
        },
        selectedStatisticOptions: {
            elements: {
                enum: Object.values(InplaceVolumesStatistic_api),
            },
        },
        selectedIndexValueCriteria: {
            enum: Object.values(IndexValueCriteria),
        },
    },
    optionalProperties: {
        selectedStatisticsLayout: {
            enum: Object.values(StatisticsLayout),
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
    const selectedStatisticsLayout = get(selectedStatisticsLayoutAtom);
    const selectedIndexValueCriteria = get(selectedIndexValueCriteriaAtom);

    const indicesWithStringifiedValues = selectedIndicesWithValues.value.map((index) => ({
        indexColumn: index.indexColumn,
        values: index.values.map((value) => value.toString()),
    }));

    return {
        selectedEnsembleIdentStrings: selectedEnsembleIdents.value.map((ident) => ident.toString()),
        selectedTableNames: selectedTableNames.value,
        selectedIndicesWithValues: indicesWithStringifiedValues,
        selectedResultNames: selectedResultNames.value,
        selectedGroupByIndices: selectedGroupByIndices.value,
        selectedTableType: selectedTableType,
        selectedStatisticOptions: selectedStatisticOptions,
        selectedStatisticsLayout: selectedStatisticsLayout,
        selectedIndexValueCriteria: selectedIndexValueCriteria,
    };
};

export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    const ensembleIdents = raw.selectedEnsembleIdentStrings
        ? getEnsembleIdentsFromStrings(raw.selectedEnsembleIdentStrings)
        : undefined;

    setIfDefined(set, selectedEnsembleIdentsAtom, ensembleIdents);
    setIfDefined(set, selectedTableNamesAtom, raw.selectedTableNames);
    setIfDefined(set, selectedIndicesWithValuesAtom, raw.selectedIndicesWithValues);
    setIfDefined(set, selectedResultNamesAtom, raw.selectedResultNames);
    setIfDefined(set, selectedGroupByIndicesAtom, raw.selectedGroupByIndices);
    setIfDefined(set, selectedTableTypeAtom, raw.selectedTableType);
    setIfDefined(set, selectedStatisticOptionsAtom, raw.selectedStatisticOptions);
    setIfDefined(set, selectedStatisticsLayoutAtom, raw.selectedStatisticsLayout);
    setIfDefined(set, selectedIndexValueCriteriaAtom, raw.selectedIndexValueCriteria);
};
