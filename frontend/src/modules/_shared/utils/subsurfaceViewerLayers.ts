import type { Layer, PickingInfo } from "@deck.gl/core";
import type { HoverData } from "@framework/HoverService";
import { HoverTopic } from "@framework/HoverService";
import type { MapMouseEvent } from "@webviz/subsurface-viewer";
import { ColormapLayer, Grid3DLayer, WellsLayer } from "@webviz/subsurface-viewer/dist/layers";
import type { WellsPickInfo } from "@webviz/subsurface-viewer/dist/layers/wells/wellsLayer";

import type { Feature, GeometryCollection } from "geojson";
import _ from "lodash";

export interface WellboreGeoJsonProperties {
    uuid: string;
    name: string;
    uwi: string;
    color: number[];
    md: [number[]];
    lineWidth: number;
    wellHeadSize: number;
}

export type WellboreGeoFeature = Feature<GeometryCollection, WellboreGeoJsonProperties>;

type ColorMapPickInfo = ReturnType<ColormapLayer["getPickingInfo"]>;

function sanitizeMdReadout(readoutValue: string | number | undefined): number | null {
    if (typeof readoutValue === "number") return readoutValue;
    if (typeof readoutValue === "undefined") return null;

    const strippedReadout = readoutValue.replaceAll(/[^\d.]/g, "");

    if (strippedReadout === "") return null;
    if (_.isNaN(strippedReadout)) return null;

    return Number(strippedReadout);
}

function getInfoPickForLayer<TPickingInfo extends PickingInfo>(
    infos: PickingInfo[],
    layerCls: new () => Layer<any>,
): TPickingInfo | undefined {
    return infos.find((i): i is TPickingInfo => i.layer instanceof layerCls);
}

function getTopicHoverDataFromPicks<TTopic extends keyof HoverData>(
    topic: TTopic,
    pickingInfos: PickingInfo[],
): HoverData[TTopic] {
    // Add more topic handlers here in the future
    switch (topic) {
        case HoverTopic.MD: {
            const wellsInfo = getInfoPickForLayer<WellsPickInfo>(pickingInfos, WellsLayer);
            const mdProperty = wellsInfo?.properties?.find((prop) => prop.name.startsWith("MD "));
            return sanitizeMdReadout(mdProperty?.value) as HoverData[TTopic];
        }
        case HoverTopic.WELLBORE: {
            const wellsInfo = getInfoPickForLayer<WellsPickInfo>(pickingInfos, WellsLayer);
            if (!wellsInfo) return null;

            const wellboreFeature = wellsInfo.object as WellboreGeoFeature;
            return wellboreFeature.properties.uuid as HoverData[TTopic];
        }

        case HoverTopic.WORLD_POS: {
            const pickWithCoords =
                getInfoPickForLayer<ColorMapPickInfo>(pickingInfos, ColormapLayer) ||
                getInfoPickForLayer<PickingInfo>(pickingInfos, Grid3DLayer);

            if (!pickWithCoords?.coordinate) return null;

            // Either layer-type will have valid x and y values
            const [x, y, z] = pickWithCoords?.coordinate ?? [];

            // ! The Z value in ColormapLayer is the camera position (I think), so we want to drop it
            const zValue = pickWithCoords.layer instanceof ColormapLayer ? undefined : z;

            return { x, y, z: zValue } as HoverData[TTopic];
        }
        default:
            console.warn("Unsupported hover topic", topic);
            return null;
    }
}

type MappedHoverData<T extends readonly HoverTopic[]> = {
    [Key in T[number]]: HoverData[Key];
};

// ? I dont fully understand why, but TTopic is needed to make MappedHoverData **only** contain the topics present in the params
export function getHoverTopicValuesInEvent<TTopic extends keyof HoverData>(
    mapMouseEvent: MapMouseEvent,
    ...topics: TTopic[]
): MappedHoverData<typeof topics> {
    const values = {} as MappedHoverData<typeof topics>;

    topics.forEach((topic) => {
        const topicInfo = getTopicHoverDataFromPicks(topic, mapMouseEvent.infos);

        // TODO: Better typing here? This seems clunky
        (values[topic] as HoverData[typeof topic]) = topicInfo;
    });

    return values;
}
