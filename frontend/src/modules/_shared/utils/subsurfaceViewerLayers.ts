import type { Layer, PickingInfo } from "@deck.gl/core";
import type { LayerPickInfo } from "@webviz/subsurface-viewer";
import { ColormapLayer, Grid3DLayer, MapLayer } from "@webviz/subsurface-viewer/dist/layers";
import type { Feature, GeometryCollection } from "geojson";
import _ from "lodash";

import { HoverTopic } from "@framework/HoverService";
import type { HoverData } from "@framework/HoverService";

import { AdjustedWellsLayer } from "../customDeckGlLayers/AdjustedWellsLayer";

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

type WellboreGeoPickInfo = LayerPickInfo<WellboreGeoFeature>;
type ColorMapPickInfo = ReturnType<ColormapLayer["getPickingInfo"]>;

function sanitizeMdReadout(readoutValue: string | number | undefined): number | null {
    if (typeof readoutValue === "number") return readoutValue;
    if (typeof readoutValue === "undefined") return null;

    const strippedReadout = readoutValue.replaceAll(/[^\d.]/g, "");

    if (strippedReadout === "") return null;
    if (_.isNaN(strippedReadout)) return null;

    return Number(strippedReadout);
}

function getInfoPickForLayer<TPickingInfo extends LayerPickInfo>(
    infos: LayerPickInfo[],
    layerCls: new () => Layer<any>,
): TPickingInfo | undefined {
    return infos.find((i): i is TPickingInfo => i.layer instanceof layerCls);
}

function getTopicHoverDataFromPicks<TTopic extends keyof HoverData>(
    topic: TTopic,
    pickingInfos: LayerPickInfo[],
): HoverData[TTopic] {
    // Add more topic handlers here in the future
    switch (topic) {
        case HoverTopic.WELLBORE_MD: {
            const wellsInfo = getInfoPickForLayer<WellboreGeoPickInfo>(pickingInfos, AdjustedWellsLayer);
            const mdProperty = wellsInfo?.properties?.find((prop) => prop.name.startsWith("MD "));
            const wellboreUuid = wellsInfo?.object?.properties.uuid;

            const mdReadout = sanitizeMdReadout(mdProperty?.value);

            if (!wellboreUuid || !mdReadout) return null;
            return { wellboreUuid, md: mdReadout } as HoverData[TTopic];
        }
        case HoverTopic.WELLBORE: {
            const wellsInfo = getInfoPickForLayer<WellboreGeoPickInfo>(pickingInfos, AdjustedWellsLayer);
            if (!wellsInfo || !wellsInfo.object) return null;

            const wellboreFeature = wellsInfo.object;
            return wellboreFeature.properties.uuid as HoverData[TTopic];
        }

        case HoverTopic.WORLD_POS_UTM: {
            const pickWithCoords =
                getInfoPickForLayer<ColorMapPickInfo>(pickingInfos, MapLayer) ||
                getInfoPickForLayer<LayerPickInfo>(pickingInfos, Grid3DLayer);

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

export function getHoverDataInPicks<TTopic extends keyof HoverData>(
    pickingInfoArr: PickingInfo[],
    ...topics: TTopic[]
): MappedHoverData<typeof topics> {
    const values = {} as MappedHoverData<typeof topics>;

    topics.forEach((topic) => {
        const topicInfo = getTopicHoverDataFromPicks(topic, pickingInfoArr);

        values[topic] = topicInfo;
    });

    return values;
}
