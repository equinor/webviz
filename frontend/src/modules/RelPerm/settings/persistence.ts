import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { setIfDefined } from "@framework/utils/atomUtils";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { ColorBy, CurveType, GroupBy, RelPermStatistic, YAxisScale } from "../typesAndEnums";

import {
    selectedColorByAtom,
    selectedCurveTypeAtom,
    selectedGroupByAtom,
    selectedStatisticsAtom,
    selectedYAxisScaleAtom,
    showIndividualRealizationsAtom,
    showStatisticalFanAtom,
    showStatisticalLinesAtom,
} from "./atoms/baseAtoms";
import {
    selectedCurveNamesAtom,
    selectedEnsembleIdentsAtom,
    selectedSaturationAxisNameAtom,
    selectedSatnumsAtom,
    selectedTableNameAtom,
} from "./atoms/persistableFixableAtoms";

export type SerializedSettings = {
    selectedEnsembleIdentStrings: string[];
    selectedTableName: string | null;
    selectedSaturationAxisName: string | null;
    selectedCurveNames: string[];
    selectedSatnums: number[];
    selectedCurveType: CurveType;
    showIndividualRealizations: boolean;
    showStatisticalLines: boolean;
    showStatisticalFan: boolean;
    selectedStatistics: RelPermStatistic[];
    selectedColorBy: ColorBy;
    selectedGroupBy: GroupBy;
    selectedYAxisScale: YAxisScale;
};

const schemaBuilder = new SchemaBuilder<SerializedSettings>(() => ({
    properties: {
        selectedEnsembleIdentStrings: { elements: { type: "string" } },
        selectedTableName: { type: "string", nullable: true },
        selectedSaturationAxisName: { type: "string", nullable: true },
        selectedCurveNames: { elements: { type: "string" } },
        selectedSatnums: { elements: { type: "int16" } },
        selectedCurveType: { enum: Object.values(CurveType) },
        showIndividualRealizations: { type: "boolean" },
        showStatisticalLines: { type: "boolean" },
        showStatisticalFan: { type: "boolean" },
        selectedStatistics: { elements: { enum: Object.values(RelPermStatistic) } },
        selectedColorBy: { enum: Object.values(ColorBy) },
        selectedGroupBy: { enum: Object.values(GroupBy) },
        selectedYAxisScale: { enum: Object.values(YAxisScale) },
    },
}));

export const SERIALIZED_SETTINGS_SCHEMA = schemaBuilder.build();

export const serializeSettings: SerializeStateFunction<SerializedSettings> = (get) => ({
    selectedEnsembleIdentStrings: get(selectedEnsembleIdentsAtom).value.map((ensembleIdent) =>
        ensembleIdent.toString(),
    ),
    selectedTableName: get(selectedTableNameAtom).value,
    selectedSaturationAxisName: get(selectedSaturationAxisNameAtom).value,
    selectedCurveNames: get(selectedCurveNamesAtom).value,
    selectedSatnums: get(selectedSatnumsAtom).value,
    selectedCurveType: get(selectedCurveTypeAtom),
    showIndividualRealizations: get(showIndividualRealizationsAtom),
    showStatisticalLines: get(showStatisticalLinesAtom),
    showStatisticalFan: get(showStatisticalFanAtom),
    selectedStatistics: get(selectedStatisticsAtom),
    selectedColorBy: get(selectedColorByAtom),
    selectedGroupBy: get(selectedGroupByAtom),
    selectedYAxisScale: get(selectedYAxisScaleAtom),
});

export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    setIfDefined(
        set,
        selectedEnsembleIdentsAtom,
        raw.selectedEnsembleIdentStrings?.map((ensembleIdentString) =>
            RegularEnsembleIdent.fromString(ensembleIdentString),
        ),
    );
    setIfDefined(set, selectedTableNameAtom, raw.selectedTableName);
    setIfDefined(set, selectedSaturationAxisNameAtom, raw.selectedSaturationAxisName);
    setIfDefined(set, selectedCurveNamesAtom, raw.selectedCurveNames);
    setIfDefined(set, selectedSatnumsAtom, raw.selectedSatnums);
    setIfDefined(set, selectedCurveTypeAtom, raw.selectedCurveType);
    setIfDefined(set, showIndividualRealizationsAtom, raw.showIndividualRealizations);
    setIfDefined(set, showStatisticalLinesAtom, raw.showStatisticalLines);
    setIfDefined(set, showStatisticalFanAtom, raw.showStatisticalFan);
    setIfDefined(set, selectedStatisticsAtom, raw.selectedStatistics);
    setIfDefined(set, selectedColorByAtom, raw.selectedColorBy);
    setIfDefined(set, selectedGroupByAtom, raw.selectedGroupBy);
    setIfDefined(set, selectedYAxisScaleAtom, raw.selectedYAxisScale);
};
