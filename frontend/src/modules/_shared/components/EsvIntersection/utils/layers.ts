import {
    Annotation,
    CalloutCanvasLayer,
    GeomodelCanvasLayer,
    GeomodelLayerV2,
    Layer,
    SchematicData,
    SchematicLayer,
    SeismicCanvasLayer,
    SurfaceData,
    WellborepathLayer,
} from "@equinor/esv-intersection";

import { PolylineIntersectionLayer } from "../layers/PolylineIntersectionLayer";
import { SeismicLayer } from "../layers/SeismicLayer";
import {
    SurfaceStatisticalFanchartsCanvasLayer,
    SurfaceStatisticalFanchartsData,
} from "../layers/SurfaceStatisticalFanchartCanvasLayer";

export function isSurfaceLayer(layer: Layer<unknown>): layer is Layer<SurfaceData> {
    return layer instanceof GeomodelLayerV2 || layer instanceof GeomodelCanvasLayer;
}

export function isPolylineIntersectionLayer(layer: Layer<unknown>): layer is PolylineIntersectionLayer {
    return layer instanceof PolylineIntersectionLayer;
}

export function isStatisticalFanchartsCanvasLayer(
    layer: Layer<unknown>
): layer is Layer<SurfaceStatisticalFanchartsData> {
    return layer instanceof SurfaceStatisticalFanchartsCanvasLayer;
}

export function isCalloutCanvasLayer(layer: Layer<unknown>): layer is CalloutCanvasLayer<Annotation[]> {
    return layer instanceof CalloutCanvasLayer;
}

export function isWellborepathLayer(layer: Layer<any>): layer is WellborepathLayer<[number, number][]> {
    return layer instanceof WellborepathLayer;
}

export function isSchematicLayer(layer: Layer<unknown>): layer is SchematicLayer<SchematicData> {
    return layer instanceof SchematicLayer;
}

export function isSeismicCanvasLayer(layer: Layer<unknown>): layer is SeismicCanvasLayer {
    return layer instanceof SeismicCanvasLayer;
}

export function isSeismicLayer(layer: Layer<unknown>): layer is SeismicLayer {
    return layer instanceof SeismicLayer;
}
