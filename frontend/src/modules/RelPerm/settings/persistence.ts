import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { setIfDefined } from "@framework/utils/atomUtils";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { ColorBy, CurveType, GroupBy, RelPermMetric, VisualizationType, YAxisScale } from "../typesAndEnums";

import {
    selectedColorByAtom,
    selectedCurveTypeAtom,
    selectedGroupByAtom,
    selectedMetricAtom,
    selectedVisualizationTypeAtom,
    selectedYAxisScaleAtom,
    userSelectedCurveNamesAtom,
    userSelectedEnsembleIdentsAtom,
    userSelectedSaturationAxisNameAtom,
    userSelectedSatnumsAtom,
    userSelectedTableNameAtom,
} from "./atoms/baseAtoms";

export type SerializedSettings = {
    selectedEnsembleIdentStrings: string[];
    selectedTableName: string | null;
    selectedSaturationAxisName: string | null;
    selectedCurveNames: string[];
    selectedSatnums: number[];
    selectedCurveType: CurveType;
    selectedVisualizationType: VisualizationType;
    selectedColorBy: ColorBy;
    selectedGroupBy: GroupBy;
    selectedYAxisScale: YAxisScale;
    selectedMetric: RelPermMetric;
};

const schemaBuilder = new SchemaBuilder<SerializedSettings>(() => ({
    properties: {
        selectedEnsembleIdentStrings: { elements: { type: "string" } },
        selectedTableName: { type: "string", nullable: true },
        selectedSaturationAxisName: { type: "string", nullable: true },
        selectedCurveNames: { elements: { type: "string" } },
        selectedSatnums: { elements: { type: "int16" } },
        selectedCurveType: { enum: Object.values(CurveType) },
        selectedVisualizationType: { enum: Object.values(VisualizationType) },
        selectedColorBy: { enum: Object.values(ColorBy) },
        selectedGroupBy: { enum: Object.values(GroupBy) },
        selectedYAxisScale: { enum: Object.values(YAxisScale) },
        selectedMetric: { enum: Object.values(RelPermMetric) },
    },
}));

export const SERIALIZED_SETTINGS_SCHEMA = schemaBuilder.build();

export const serializeSettings: SerializeStateFunction<SerializedSettings> = (get) => ({
    selectedEnsembleIdentStrings: get(userSelectedEnsembleIdentsAtom).map((ensembleIdent) => ensembleIdent.toString()),
    selectedTableName: get(userSelectedTableNameAtom),
    selectedSaturationAxisName: get(userSelectedSaturationAxisNameAtom),
    selectedCurveNames: get(userSelectedCurveNamesAtom),
    selectedSatnums: get(userSelectedSatnumsAtom),
    selectedCurveType: get(selectedCurveTypeAtom),
    selectedVisualizationType: get(selectedVisualizationTypeAtom),
    selectedColorBy: get(selectedColorByAtom),
    selectedGroupBy: get(selectedGroupByAtom),
    selectedYAxisScale: get(selectedYAxisScaleAtom),
    selectedMetric: get(selectedMetricAtom),
});

export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    setIfDefined(
        set,
        userSelectedEnsembleIdentsAtom,
        raw.selectedEnsembleIdentStrings?.map((ensembleIdentString) =>
            RegularEnsembleIdent.fromString(ensembleIdentString),
        ),
    );
    setIfDefined(set, userSelectedTableNameAtom, raw.selectedTableName);
    setIfDefined(set, userSelectedSaturationAxisNameAtom, raw.selectedSaturationAxisName);
    setIfDefined(set, userSelectedCurveNamesAtom, raw.selectedCurveNames);
    setIfDefined(set, userSelectedSatnumsAtom, raw.selectedSatnums);
    setIfDefined(set, selectedCurveTypeAtom, raw.selectedCurveType);
    setIfDefined(set, selectedVisualizationTypeAtom, raw.selectedVisualizationType);
    setIfDefined(set, selectedColorByAtom, raw.selectedColorBy);
    setIfDefined(set, selectedGroupByAtom, raw.selectedGroupBy);
    setIfDefined(set, selectedYAxisScaleAtom, raw.selectedYAxisScale);
    setIfDefined(set, selectedMetricAtom, raw.selectedMetric);
};