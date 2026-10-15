import type { WellsLayerProps } from "@webviz/subsurface-viewer/dist/layers";
import type { WellLabelLayerProps } from "@webviz/subsurface-viewer/dist/layers/wells/layers/wellLabelLayer";
import { LabelOrientation } from "@webviz/subsurface-viewer/dist/layers/wells/layers/wellLabelLayer";
import type { Feature } from "geojson";

export const PLANNED_WELL_COLOR: [number, number, number] = [150, 60, 210];
export const PLANNED_WELL_COLOR_CSS = `rgb(${PLANNED_WELL_COLOR.join(", ")})`;

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

const DEFAULT_WELLS_LAYER_PROPS: Omit<Partial<WellsLayerProps>, "data" | "id"> = {
    refine: false,
    pickable: true,
    outline: false,
    ZIncreasingDownwards: true,

    lineStyle: { width: getLineStyleWidth, color: getColor },
    wellHeadStyle: { size: getWellHeadStyleWidth, color: getColor },
};

export const DEFAULT_WELL_LABEL_LAYER_PROPS_3D: Partial<WellLabelLayerProps> = {
    getSize: 9,
    background: true,
    autoPosition: true,
    orientation: LabelOrientation.HORIZONTAL,
};

export const DEFAULT_WELL_LABEL_LAYER_PROPS_2D: Partial<WellLabelLayerProps> = {
    orientation: LabelOrientation.TANGENT,
    positionFormat: "XY",
    getPositionAlongPath: 1,
    getBackgroundColor: [255, 255, 255, 255 * 0.1],
    getTextAnchor: "end",
    getAlignmentBaseline: "top",
};

export const DEFAULT_WELLS_LAYER_PROPS_3D: Omit<Partial<WellsLayerProps>, "data" | "id"> = {
    ...DEFAULT_WELLS_LAYER_PROPS,
    positionFormat: "XYZ",
    depthTest: true,
    pickable: "3d",
    wellLabel: DEFAULT_WELL_LABEL_LAYER_PROPS_3D,
};

export const DEFAULT_WELLS_LAYER_PROPS_2D: Omit<Partial<WellsLayerProps>, "data" | "id"> = {
    ...DEFAULT_WELLS_LAYER_PROPS,
    positionFormat: "XY",
    depthTest: false,
    pickable: true,
    wellLabel: DEFAULT_WELL_LABEL_LAYER_PROPS_2D,

    // ! The basic trajectory sub-layer does not respect the position format, which causes
    // ! issues when picking MD in 2D. This setting forces the layer to use the screens
    // ! trajectory layer, which correctly applies the position format
    markers: { showScreenTrajectoryAsDash: true },
};

export const DEFAULT_WELLS_LAYER_PROPS_BY_VIEW_MODE = {
    "2D": DEFAULT_WELLS_LAYER_PROPS_2D,
    "3D": DEFAULT_WELLS_LAYER_PROPS_3D,
};
