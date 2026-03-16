import type { WellsLayerProps } from "@webviz/subsurface-viewer/dist/layers";
import { LabelOrientation } from "@webviz/subsurface-viewer/dist/layers/wells/layers/wellLabelLayer";
import type { Feature } from "geojson";

function getLineStyleWidth(d: Feature): number {
    if (d.properties && "lineWidth" in d.properties) {
        return d.properties.lineWidth as number;
    }
    return 2;
}

function getWellHeadStyleWidth(d: Feature): number {
    if (d.properties && "wellHeadSize" in d.properties) {
        return d.properties.wellHeadSize as number;
    }
    return 12;
}

function getColor(d: Feature): [number, number, number, number] {
    if (d.properties && "color" in d.properties) {
        return d.properties.color as [number, number, number, number];
    }
    return [50, 50, 50, 100];
}

export const DEFAULT_WELLS_LAYER_PROPS: Omit<Partial<WellsLayerProps>, "data" | "id"> = {
    refine: false,
    pickable: true,
    outline: true,
    ZIncreasingDownwards: true,

    lineStyle: { width: getLineStyleWidth, color: getColor },
    wellHeadStyle: { size: getWellHeadStyleWidth, color: getColor },
    wellLabel: {
        getSize: 9,
        background: true,
        autoPosition: true,
        orientation: LabelOrientation.HORIZONTAL,
    },
};
