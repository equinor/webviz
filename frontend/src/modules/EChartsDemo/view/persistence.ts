
import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { setIfDefined } from "@framework/utils/atomUtils";

import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { chartZoomAtom, INITIAL_ZOOM } from "./atoms/baseAtoms";
import { ChartZoomState } from "@modules/_shared/eCharts/core/composeChartOption";



export type SerializedView = {
    viewState: ChartZoomState | null;
};

const schemaBuilder = new SchemaBuilder<SerializedView>(() => ({
    properties: {
        viewState: {
            optionalProperties: {
                x: {
                    properties: {
                        start: { type: "float64" },
                        end: { type: "float64" },
                    },
                },
                y: {
                    properties: {
                        start: { type: "float64" },
                        end: { type: "float64" },
                    },
                },
            },
            nullable: true,
        },
    },
}));

export const SERIALIZED_VIEW = schemaBuilder.build();

export const serializeView: SerializeStateFunction<SerializedView> = (get) => {
    const viewState = get(chartZoomAtom);
    return {
        viewState: viewState ? viewState : INITIAL_ZOOM,
    };
}

export const deserializeView: DeserializeStateFunction<SerializedView> = (raw, set) => {
    setIfDefined(set, chartZoomAtom, raw.viewState ? raw.viewState : INITIAL_ZOOM);
}