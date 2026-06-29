import type { Layer, PickingInfo } from "@deck.gl/core";
import type { WellFeature as BaseWellFeature, LayerPickInfo } from "@webviz/subsurface-viewer";
import { ColormapLayer, Grid3DLayer, MapLayer, WellMarkersLayer } from "@webviz/subsurface-viewer/dist/layers";
import type { MarkerData } from "@webviz/subsurface-viewer/dist/layers/wells/layers/flatWellMarkersLayer";
import { FlatWellMarkersLayer } from "@webviz/subsurface-viewer/dist/layers/wells/layers/flatWellMarkersLayer";
import type {
    GeoJsonWellProperties as BaseWellProperties,
    PerforationProperties,
    WellsPickInfo,
} from "@webviz/subsurface-viewer/dist/layers/wells/types";
import { isNaN } from "lodash-es";

import { HoverTopic } from "@framework/HoverService";
import type { HoverData } from "@framework/HoverService";
import type { FlowDataColors } from "@framework/types/wellbore";
import { InjectionPhase, ProductionPhase } from "@framework/types/wellbore";

import type { CategoricalReadout, ReadoutProperty } from "../components/Readout/types";
import { AdjustedWellsLayer } from "../customDeckGlLayers/AdjustedWellsLayer";
import type { DrilledWellboreTrajectoryData } from "../DataProviderFramework/dataProviders/implementations/DrilledWellboreTrajectoriesProvider";

import { formatNumber } from "./numberFormatting";
import type { InjectionReadoutValue, ProductionReadoutValue } from "./subsurfaceViewer/FlowDataReadout";
import { renderInjectionReadout, renderProductionReadout } from "./subsurfaceViewer/FlowDataReadout";

export type ExtendedWellFeatureProperties = BaseWellProperties & {
    uuid: string;
    uwi: string;

    // Overrides md in base type to be a length 1 array
    md: [number[]];

    // Styling
    lineWidth: number;
    wellHeadSize: number;

    // "Rich" info
    status?: DrilledWellboreTrajectoryData["wellboreStatus"];
    purpose?: DrilledWellboreTrajectoryData["wellborePurpose"];
    injectionData?: DrilledWellboreTrajectoryData["injectionData"];
    productionData?: DrilledWellboreTrajectoryData["productionData"];
};

export type ExtendedWellFeature = BaseWellFeature & { properties: ExtendedWellFeatureProperties };

export type WellboreGeoPickInfo = LayerPickInfo<ExtendedWellFeature>;
export type ColorMapPickInfo = ReturnType<ColormapLayer["getPickingInfo"]>;

export type LayerPickInfoWithReadout<TData> = LayerPickInfo<TData> & { readout?: CategoricalReadout };

function sanitizeMdReadout(readoutValue: string | number | undefined): number | null {
    if (readoutValue == null) return null;
    if (typeof readoutValue === "number") return readoutValue;

    const strippedReadout = readoutValue.replaceAll(/[^\d.]/g, "");

    if (strippedReadout === "") return null;
    if (isNaN(strippedReadout)) return null;

    return Number(strippedReadout);
}

function getInfoPickForLayer<TPickingInfo extends LayerPickInfo>(
    infos: LayerPickInfo[],
    layerCls: new () => Layer<any>,
): TPickingInfo | undefined {
    return infos.find((i): i is TPickingInfo => i.layer instanceof layerCls);
}

function getWellFeatureFromSubLayerData(pick: LayerPickInfoWithReadout<ExtendedWellFeature> | undefined) {
    if (!pick) return undefined;

    if (pick.sourceLayer instanceof FlatWellMarkersLayer || pick.sourceLayer instanceof WellMarkersLayer) {
        const markerObject = pick.object as MarkerData<ExtendedWellFeature> | undefined;
        return markerObject?.sourceObject;
    }

    return pick.object;
}

function getTopicHoverDataFromPicks<TTopic extends keyof HoverData>(
    topic: TTopic,
    pickingInfos: LayerPickInfo[],
): HoverData[TTopic] {
    // Add more topic handlers here in the future
    switch (topic) {
        case HoverTopic.WELLBORE_MD: {
            const wellsInfo = getInfoPickForLayer<LayerPickInfoWithReadout<ExtendedWellFeature>>(
                pickingInfos,
                AdjustedWellsLayer,
            );
            const wellFeature = getWellFeatureFromSubLayerData(wellsInfo);

            const mdProperty = wellsInfo?.readout?.properties?.find((prop) => prop.name === "MD");

            const wellboreUuid = wellFeature?.properties.uuid;
            const mdReadout = sanitizeMdReadout(mdProperty?.value);

            if (!wellboreUuid || !mdReadout) return null;
            return { wellboreUuid, md: mdReadout } as HoverData[TTopic];
        }
        case HoverTopic.WELLBORE: {
            const wellsInfo = getInfoPickForLayer<LayerPickInfoWithReadout<ExtendedWellFeature>>(
                pickingInfos,
                AdjustedWellsLayer,
            );
            const wellboreFeature = getWellFeatureFromSubLayerData(wellsInfo);

            if (!wellsInfo || !wellboreFeature) return null;

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

function getGroupNameFromPickInfo(info: LayerPickInfo<unknown>): string {
    if (info.index === -1) return "default";
    // subsurface-comps uses a name prop for their readout
    if ("name" in info.layer!) return info.layer.name as string;
    if ("name" in info.layer!.props) return info.layer?.props.name as string;

    return "default";
}

function getObjectNameFromPickInfo(info: LayerPickInfo<unknown>): string {
    if (info.index === -1) return "";
    if (!info.object) return "";
    const object = info.object as any;

    if (typeof object === "object") {
        if (object.properties?.name) {
            return object.properties?.name;
        } else if (object.name) {
            return object.name;
        }
    }

    return "";
}

function sanitizeSubsurfaceValue(value: any): string {
    if (typeof value === "number") {
        return formatNumber(value, 0);
    } else {
        return String(value);
    }
}

function getPropertiesPickInfo(info: LayerPickInfo<unknown>): ReadoutProperty[] {
    const properties: ReadoutProperty[] = [];

    if ("propertyValue" in info) {
        properties.push({
            name: "Value",
            value: sanitizeSubsurfaceValue(info.propertyValue),
        });
    }

    if ("properties" in info && Array.isArray(info.properties)) {
        info.properties.forEach((p) => {
            properties.push({
                name: p.name,
                value: sanitizeSubsurfaceValue(p.value),
            });
        });
    }

    return properties;
}

/**
 * Attempts to find relevant info in assorted deck.gl layer picks
 */
export function getReadoutFromSubsurfacePick(info: PickingInfo): CategoricalReadout | null {
    if (info.index === -1) return null;

    // If we want to include any special cases for some sub-surface layers, we can add them here
    // if(info.sourceLayer instanceOf MyLayer)

    const group = getGroupNameFromPickInfo(info);
    const name = getObjectNameFromPickInfo(info);
    const props = getPropertiesPickInfo(info);

    return {
        group: name ? group : "default",
        name: name ? name : group,
        properties: props,
    };
}

export function isExtendedWellFeature(wellFeature: BaseWellFeature): wellFeature is ExtendedWellFeature {
    return "uuid" in wellFeature.properties;
}

export function getDepthFromSubsurfaceReadout(wellsLayerInfo: WellsPickInfo) {
    if (!wellsLayerInfo.properties) return [];

    const mdReadout = wellsLayerInfo.properties.find((prop) => prop.name.startsWith("MD "))?.value;
    const tvdReadout = wellsLayerInfo.properties.find((prop) => prop.name.startsWith("TVD "))?.value;

    const sanitizedMd = sanitizeMdReadout(mdReadout);
    const sanitizedTvd = sanitizeMdReadout(tvdReadout);

    const properties: ReadoutProperty<number | null>[] = [];

    function formatDepth(v: number | null): string {
        if (v === null) return "--";

        return v.toFixed(0) + " m";
    }

    properties.push({ name: "MD", value: sanitizedMd, format: formatDepth });
    properties.push({ name: "TVD", value: sanitizedTvd, format: formatDepth });

    return properties;
}

export function getMarkerReadout(marker: MarkerData): ReadoutProperty<string>[] {
    if (marker.type === "perforation") {
        const props = marker.properties as PerforationProperties;
        return [
            {
                name: "Perforation",
                value: props.status,
            },
        ];
    }

    return [];
}

export function getFlowReadout(
    wellFeature: BaseWellFeature,
    productionColors?: FlowDataColors,
    injectionColors?: FlowDataColors,
): ReadoutProperty<ProductionReadoutValue | InjectionReadoutValue>[] {
    if (!wellFeature.properties) return [];
    if (!isExtendedWellFeature(wellFeature)) return [];

    const { productionData, injectionData } = wellFeature.properties;

    const productionReadoutValue: ProductionReadoutValue = {
        [ProductionPhase.OIL]: productionData?.oilProductionSm3,
        [ProductionPhase.GAS]: productionData?.gasProductionSm3,
        [ProductionPhase.WATER]: productionData?.waterProductionM3,
    };
    const injectionReadoutValue: InjectionReadoutValue = {
        [InjectionPhase.GAS]: injectionData?.gasInjection,
        [InjectionPhase.WATER]: injectionData?.waterInjection,
    };

    return [
        {
            name: "Production",
            value: productionReadoutValue,
            renderArgs: { colors: productionColors },
            render: renderProductionReadout,
        },
        {
            name: "Injection",
            value: injectionReadoutValue,
            renderArgs: { colors: injectionColors },
            render: renderInjectionReadout,
        },
    ];
}

export function getWellMetaReadout(wellFeature: BaseWellFeature): ReadoutProperty[] {
    if (!wellFeature.properties) return [];
    if (!isExtendedWellFeature(wellFeature)) return [];

    const { status, purpose } = wellFeature.properties;

    const properties: ReadoutProperty[] = [];

    if (purpose)
        properties.push({
            name: "Purpose",
            value: purpose,
        });

    if (status)
        properties.push({
            name: "Status",
            value: status,
        });

    return properties;
}

export function isPickWithReadout<T>(pickInfo: LayerPickInfo): pickInfo is LayerPickInfoWithReadout<T> {
    return "readout" in pickInfo && typeof pickInfo.readout === "object";
}

export function getGeoWellFeaturePath(wellFeature: BaseWellFeature): GeoJSON.Position[] {
    if (!wellFeature.geometry) return [];
    if (wellFeature.geometry.type !== "GeometryCollection") return [];

    return wellFeature.geometry.geometries.find((g) => g.type === "LineString")?.coordinates ?? [];
}
