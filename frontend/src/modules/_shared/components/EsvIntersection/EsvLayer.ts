import type {
    Annotation,
    CalloutOptions,
    GeomodelLayerLabelsOptions,
    LayerOptions,
    ReferenceLine,
    SchematicData,
    SchematicLayerOptions,
    SeismicCanvasData,
    SurfaceData,
    WellborepathLayerOptions,
} from "@equinor/esv-intersection";

import type { ColorScale } from "@lib/utils/ColorScale";

import type { PolylineIntersectionData, PolylineIntersectionLayerOptions } from "./layers/PolylineIntersectionLayer";
import type { SeismicLayerData } from "./layers/SeismicLayer";
import type { SurfaceStatisticalFanchartsData } from "./layers/SurfaceStatisticalFanchartCanvasLayer";

export enum EsvLayerType {
    CALLOUT_CANVAS = "callout-canvas",
    GEOMODEL_CANVAS = "geomodel-canvas",
    GEOMODEL_LABELS = "geomodel-labels",
    GEOMODEL_V2 = "geomodel-v2",
    POLYLINE_INTERSECTION = "polyline-intersection",
    IMAGE_CANVAS = "image-canvas",
    REFERENCE_LINE = "reference-line",
    SCHEMATIC = "schematic-layer",
    SEISMIC_CANVAS = "seismic-canvas",
    SEISMIC = "seismic",
    SURFACE_STATISTICAL_FANCHARTS_CANVAS = "surface-statistical-fancharts-canvas",
    WELLBORE_PATH = "wellborepath",
}

export type EsvLayerOptionsMap = {
    [EsvLayerType.CALLOUT_CANVAS]: CalloutOptions<Annotation[]>;
    [EsvLayerType.GEOMODEL_CANVAS]: LayerOptions<SurfaceData>;
    [EsvLayerType.GEOMODEL_LABELS]: GeomodelLayerLabelsOptions<SurfaceData>;
    [EsvLayerType.GEOMODEL_V2]: LayerOptions<SurfaceData>;
    [EsvLayerType.IMAGE_CANVAS]: LayerOptions<unknown>;
    [EsvLayerType.POLYLINE_INTERSECTION]: PolylineIntersectionLayerOptions;
    [EsvLayerType.REFERENCE_LINE]: LayerOptions<ReferenceLine[]>;
    [EsvLayerType.SCHEMATIC]: SchematicLayerOptions<SchematicData>;
    [EsvLayerType.SEISMIC]: LayerOptions<SeismicLayerData>;
    [EsvLayerType.SEISMIC_CANVAS]: LayerOptions<SeismicCanvasData & { colorScale?: ColorScale }>;
    [EsvLayerType.SURFACE_STATISTICAL_FANCHARTS_CANVAS]: LayerOptions<SurfaceStatisticalFanchartsData>;
    [EsvLayerType.WELLBORE_PATH]: WellborepathLayerOptions<[number, number][]>;
};

export type EsvLayerDataTypeMap = {
    [EsvLayerType.CALLOUT_CANVAS]: Annotation[];
    [EsvLayerType.GEOMODEL_CANVAS]: SurfaceData;
    [EsvLayerType.GEOMODEL_LABELS]: SurfaceData;
    [EsvLayerType.GEOMODEL_V2]: SurfaceData;
    [EsvLayerType.IMAGE_CANVAS]: unknown;
    [EsvLayerType.POLYLINE_INTERSECTION]: PolylineIntersectionData;
    [EsvLayerType.REFERENCE_LINE]: ReferenceLine[];
    [EsvLayerType.SCHEMATIC]: SchematicData;
    [EsvLayerType.SEISMIC]: SeismicLayerData;
    [EsvLayerType.SEISMIC_CANVAS]: SeismicCanvasData;
    [EsvLayerType.SURFACE_STATISTICAL_FANCHARTS_CANVAS]: SurfaceStatisticalFanchartsData;
    [EsvLayerType.WELLBORE_PATH]: [number, number][];
};

type LayerSettings = {
    name?: string;
    hoverable?: boolean;
};

export abstract class EsvLayer<T extends EsvLayerType = EsvLayerType> {
    abstract readonly layerType: T;
    readonly id: string;
    readonly name: string;
    readonly hoverable: boolean;
    readonly options: EsvLayerOptionsMap[T];

    constructor(id: string, options: EsvLayerOptionsMap[T], settings: LayerSettings = {}) {
        this.id = id;
        this.options = options;
        this.name = settings.name ?? "";
        this.hoverable = settings.hoverable ?? false;
    }
}

export class CalloutCanvasLayer extends EsvLayer<EsvLayerType.CALLOUT_CANVAS> {
    readonly layerType = EsvLayerType.CALLOUT_CANVAS;
    constructor(id: string, options: EsvLayerOptionsMap[EsvLayerType.CALLOUT_CANVAS], settings?: LayerSettings) {
        super(id, options, settings);
    }
}

export class GeomodelCanvasLayer extends EsvLayer<EsvLayerType.GEOMODEL_CANVAS> {
    readonly layerType = EsvLayerType.GEOMODEL_CANVAS;
    constructor(id: string, options: EsvLayerOptionsMap[EsvLayerType.GEOMODEL_CANVAS], settings?: LayerSettings) {
        super(id, options, settings);
    }
}

export class GeomodelLabelsLayer extends EsvLayer<EsvLayerType.GEOMODEL_LABELS> {
    readonly layerType = EsvLayerType.GEOMODEL_LABELS;
    constructor(id: string, options: EsvLayerOptionsMap[EsvLayerType.GEOMODEL_LABELS], settings?: LayerSettings) {
        super(id, options, settings);
    }
}

export class GeomodelV2Layer extends EsvLayer<EsvLayerType.GEOMODEL_V2> {
    readonly layerType = EsvLayerType.GEOMODEL_V2;
    constructor(id: string, options: EsvLayerOptionsMap[EsvLayerType.GEOMODEL_V2], settings?: LayerSettings) {
        super(id, options, settings);
    }
}

export class PolylineIntersectionLayer extends EsvLayer<EsvLayerType.POLYLINE_INTERSECTION> {
    readonly layerType = EsvLayerType.POLYLINE_INTERSECTION;
    constructor(
        id: string,
        options: EsvLayerOptionsMap[EsvLayerType.POLYLINE_INTERSECTION],
        settings?: LayerSettings,
    ) {
        super(id, options, settings);
    }
}

export class ImageCanvasLayer extends EsvLayer<EsvLayerType.IMAGE_CANVAS> {
    readonly layerType = EsvLayerType.IMAGE_CANVAS;
    constructor(id: string, options: EsvLayerOptionsMap[EsvLayerType.IMAGE_CANVAS], settings?: LayerSettings) {
        super(id, options, settings);
    }
}

export class ReferenceLineLayer extends EsvLayer<EsvLayerType.REFERENCE_LINE> {
    readonly layerType = EsvLayerType.REFERENCE_LINE;
    constructor(id: string, options: EsvLayerOptionsMap[EsvLayerType.REFERENCE_LINE], settings?: LayerSettings) {
        super(id, options, settings);
    }
}

export class SchematicLayer extends EsvLayer<EsvLayerType.SCHEMATIC> {
    readonly layerType = EsvLayerType.SCHEMATIC;
    constructor(id: string, options: EsvLayerOptionsMap[EsvLayerType.SCHEMATIC], settings?: LayerSettings) {
        super(id, options, settings);
    }
}

export class SeismicCanvasLayer extends EsvLayer<EsvLayerType.SEISMIC_CANVAS> {
    readonly layerType = EsvLayerType.SEISMIC_CANVAS;
    constructor(id: string, options: EsvLayerOptionsMap[EsvLayerType.SEISMIC_CANVAS], settings?: LayerSettings) {
        super(id, options, settings);
    }
}

export class SeismicLayer extends EsvLayer<EsvLayerType.SEISMIC> {
    readonly layerType = EsvLayerType.SEISMIC;
    constructor(id: string, options: EsvLayerOptionsMap[EsvLayerType.SEISMIC], settings?: LayerSettings) {
        super(id, options, settings);
    }
}

export class SurfaceStatisticalFanchartsCanvasLayer extends EsvLayer<EsvLayerType.SURFACE_STATISTICAL_FANCHARTS_CANVAS> {
    readonly layerType = EsvLayerType.SURFACE_STATISTICAL_FANCHARTS_CANVAS;
    constructor(
        id: string,
        options: EsvLayerOptionsMap[EsvLayerType.SURFACE_STATISTICAL_FANCHARTS_CANVAS],
        settings?: LayerSettings,
    ) {
        super(id, options, settings);
    }
}

export class WellborePathLayer extends EsvLayer<EsvLayerType.WELLBORE_PATH> {
    readonly layerType = EsvLayerType.WELLBORE_PATH;
    constructor(id: string, options: EsvLayerOptionsMap[EsvLayerType.WELLBORE_PATH], settings?: LayerSettings) {
        super(id, options, settings);
    }
}
