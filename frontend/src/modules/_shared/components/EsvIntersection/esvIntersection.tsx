import React from "react";

import {
    Annotation,
    AxisOptions,
    CalloutCanvasLayer,
    CalloutOptions,
    Controller,
    GeomodelCanvasLayer,
    GeomodelLabelsLayer,
    GeomodelLayerLabelsOptions,
    GeomodelLayerV2,
    GridLayer,
    ImageLayer,
    IntersectionReferenceSystem,
    Layer,
    LayerOptions,
    PixiRenderApplication,
    ReferenceLine,
    ReferenceLineLayer,
    SchematicData,
    SchematicLayer,
    SchematicLayerOptions,
    SeismicCanvasData,
    SeismicCanvasLayer,
    SurfaceData,
    WellborepathLayer,
    WellborepathLayerOptions,
} from "@equinor/esv-intersection";
import { useElementSize } from "@lib/hooks/useElementSize";
import { Size2D } from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { isEqual } from "lodash";

import {
    InteractionHandler,
    InteractionHandlerTopic,
    InteractionHandlerTopicPayload,
} from "./interaction/InteractionHandler";
import {
    PolylineIntersectionData,
    PolylineIntersectionLayer,
    PolylineIntersectionLayerOptions,
} from "./layers/PolylineIntersectionLayer";
import {
    SurfaceStatisticalFanchartsCanvasLayer,
    SurfaceStatisticalFanchartsData,
} from "./layers/SurfaceStatisticalFanchartCanvasLayer";
import { ReadoutItem } from "./types/types";

export enum LayerType {
    CALLOUT_CANVAS = "callout-canvas",
    GEOMODEL_CANVAS = "geomodel-canvas",
    GEOMODEL_LABELS = "geomodel-labels",
    GEOMODEL_V2 = "geomodel-v2",
    POLYLINE_INTERSECTION = "grid-intersection",
    IMAGE_CANVAS = "image-canvas",
    REFERENCE_LINE = "reference-line",
    SCHEMATIC = "schematic-layer",
    SEISMIC_CANVAS = "seismic-canvas",
    SURFACE_STATISTICAL_FANCHARTS_CANVAS = "surface-statistical-fancharts-canvas",
    WELLBORE_PATH = "wellborepath",
}

type LayerDataTypeMap = {
    [LayerType.CALLOUT_CANVAS]: Annotation[];
    [LayerType.GEOMODEL_CANVAS]: SurfaceData;
    [LayerType.GEOMODEL_LABELS]: SurfaceData;
    [LayerType.GEOMODEL_V2]: SurfaceData;
    [LayerType.IMAGE_CANVAS]: unknown;
    [LayerType.POLYLINE_INTERSECTION]: PolylineIntersectionData;
    [LayerType.REFERENCE_LINE]: ReferenceLine[];
    [LayerType.SCHEMATIC]: SchematicData;
    [LayerType.SEISMIC_CANVAS]: SeismicCanvasData;
    [LayerType.SURFACE_STATISTICAL_FANCHARTS_CANVAS]: SurfaceStatisticalFanchartsData;
    [LayerType.WELLBORE_PATH]: [number, number][];
};

type LayerOptionsMap = {
    [LayerType.CALLOUT_CANVAS]: CalloutOptions<Annotation[]>;
    [LayerType.GEOMODEL_CANVAS]: LayerOptions<SurfaceData>;
    [LayerType.GEOMODEL_LABELS]: GeomodelLayerLabelsOptions<SurfaceData>;
    [LayerType.GEOMODEL_V2]: LayerOptions<SurfaceData>;
    [LayerType.IMAGE_CANVAS]: LayerOptions<unknown>;
    [LayerType.POLYLINE_INTERSECTION]: PolylineIntersectionLayerOptions;
    [LayerType.REFERENCE_LINE]: LayerOptions<ReferenceLine[]>;
    [LayerType.SCHEMATIC]: SchematicLayerOptions<SchematicData>;
    [LayerType.SEISMIC_CANVAS]: LayerOptions<SeismicCanvasData>;
    [LayerType.SURFACE_STATISTICAL_FANCHARTS_CANVAS]: LayerOptions<SurfaceStatisticalFanchartsData>;
    [LayerType.WELLBORE_PATH]: WellborepathLayerOptions<[number, number][]>;
};

export type LayerItem = {
    [T in keyof LayerOptionsMap]: {
        type: T;
        options: LayerOptionsMap[T];
    };
}[keyof LayerOptionsMap] & {
    id: string;
    hoverable?: boolean;
};

export interface EsvIntersectionReadoutEvent {
    readoutItems: ReadoutItem[];
}

export type Bounds = {
    x: [number, number];
    y: [number, number];
};

export type Viewport = [number, number, number];

export type EsvIntersectionProps = {
    size?: Size2D;
    showGrid?: boolean;
    axesOptions?: AxisOptions;
    showAxesLabels?: boolean;
    showAxes?: boolean;
    layers?: LayerItem[];
    bounds?: Bounds;
    viewport?: Viewport;
    intersectionReferenceSystem?: IntersectionReferenceSystem;
    zFactor?: number;
    onReadout?: (event: EsvIntersectionReadoutEvent) => void;
};

function makeLayer<T extends keyof LayerDataTypeMap>(
    type: T,
    id: string,
    options: LayerOptionsMap[T],
    pixiRenderApplication: PixiRenderApplication
): Layer<LayerDataTypeMap[T]> {
    switch (type) {
        case LayerType.CALLOUT_CANVAS:
            return new CalloutCanvasLayer(id, options as CalloutOptions<Annotation[]>) as unknown as Layer<
                LayerDataTypeMap[T]
            >;
        case LayerType.GEOMODEL_CANVAS:
            return new GeomodelCanvasLayer(id, options as LayerOptions<SurfaceData>) as unknown as Layer<
                LayerDataTypeMap[T]
            >;
        case LayerType.GEOMODEL_LABELS:
            return new GeomodelLabelsLayer(id, options as LayerOptions<SurfaceData>) as unknown as Layer<
                LayerDataTypeMap[T]
            >;
        case LayerType.GEOMODEL_V2:
            return new GeomodelLayerV2(
                pixiRenderApplication,
                id,
                options as LayerOptions<SurfaceData>
            ) as unknown as Layer<LayerDataTypeMap[T]>;
        case LayerType.POLYLINE_INTERSECTION:
            return new PolylineIntersectionLayer(
                pixiRenderApplication,
                id,
                options as PolylineIntersectionLayerOptions
            ) as unknown as Layer<LayerDataTypeMap[T]>;
        case LayerType.IMAGE_CANVAS:
            return new ImageLayer(id, options as LayerOptions<unknown>) as unknown as Layer<LayerDataTypeMap[T]>;
        case LayerType.REFERENCE_LINE:
            return new ReferenceLineLayer(id, options as LayerOptions<ReferenceLine[]>) as unknown as Layer<
                LayerDataTypeMap[T]
            >;
        case LayerType.SCHEMATIC:
            return new SchematicLayer(
                pixiRenderApplication,
                id,
                options as SchematicLayerOptions<SchematicData>
            ) as unknown as Layer<LayerDataTypeMap[T]>;
        case LayerType.SEISMIC_CANVAS:
            return new SeismicCanvasLayer(id, options as LayerOptions<SeismicCanvasData>) as unknown as Layer<
                LayerDataTypeMap[T]
            >;
        case LayerType.SURFACE_STATISTICAL_FANCHARTS_CANVAS:
            return new SurfaceStatisticalFanchartsCanvasLayer(
                id,
                options as LayerOptions<SurfaceStatisticalFanchartsData>
            ) as unknown as Layer<LayerDataTypeMap[T]>;
        case LayerType.WELLBORE_PATH:
            return new WellborepathLayer(
                id,
                options as WellborepathLayerOptions<[number, number][]>
            ) as unknown as Layer<LayerDataTypeMap[T]>;
    }

    throw new Error("Unsupported layer type");
}

export function EsvIntersection(props: EsvIntersectionProps): React.ReactNode {
    const { onReadout: onHover } = props;

    const [prevAxesOptions, setPrevAxesOptions] = React.useState<AxisOptions | null | undefined>(null);
    const [prevIntersectionReferenceSystem, setPrevIntersectionReferenceSystem] = React.useState<
        IntersectionReferenceSystem | null | undefined
    >(null);
    const [prevShowGrid, setPrevShowGrid] = React.useState<boolean | null | undefined>(null);
    const [prevContainerSize, setPrevContainerSize] = React.useState<Size2D | null | undefined>(null);
    const [prevLayers, setPrevLayers] = React.useState<LayerItem[] | null | undefined>(null);
    const [prevBounds, setPrevBounds] = React.useState<Bounds | null | undefined>(null);
    const [prevViewport, setPrevViewport] = React.useState<Viewport | null | undefined>(null);
    const [prevShowAxesLabels, setPrevShowAxesLabels] = React.useState<boolean | null | undefined>(null);
    const [prevShowAxes, setPrevShowAxes] = React.useState<boolean | null | undefined>(null);
    const [prevZFactor, setPrevZFactor] = React.useState<number | null | undefined>(null);

    const [layerIds, setLayerIds] = React.useState<string[]>([]);

    const [esvController, setEsvController] = React.useState<Controller | null>(null);
    const [interactionHandler, setInteractionHandler] = React.useState<InteractionHandler | null>(null);
    const [pixiRenderApplication, setPixiRenderApplication] = React.useState<PixiRenderApplication | null>(null);

    const containerRef = React.useRef<HTMLDivElement>(null);

    const containerSize = useElementSize(containerRef);

    if (esvController && interactionHandler && pixiRenderApplication) {
        if (
            !isEqual(prevIntersectionReferenceSystem, props.intersectionReferenceSystem) &&
            props.intersectionReferenceSystem
        ) {
            esvController.setReferenceSystem(props.intersectionReferenceSystem);
            setPrevIntersectionReferenceSystem(props.intersectionReferenceSystem);
            // In order to rerender
            esvController.adjustToSize(containerSize.width, containerSize.height);
        }

        if (!isEqual(prevAxesOptions, props.axesOptions)) {
            if (props.axesOptions?.xLabel) {
                esvController.axis?.setLabelX(props.axesOptions.xLabel);
            }
            if (props.axesOptions?.yLabel) {
                esvController.axis?.setLabelY(props.axesOptions.yLabel);
            }
            if (props.axesOptions?.unitOfMeasure) {
                esvController.axis?.setUnitOfMeasure(props.axesOptions.unitOfMeasure);
            }
            setPrevAxesOptions(props.axesOptions);
        }

        if (prevShowGrid !== props.showGrid) {
            if (props.showGrid) {
                esvController.showLayer("grid");
            } else {
                esvController.hideLayer("grid");
            }
            setPrevShowGrid(props.showGrid);
        }

        if (prevShowAxes !== props.showAxes) {
            if (props.showAxes) {
                esvController.showAxis();
            } else {
                esvController.hideAxis();
            }
            setPrevShowAxes(props.showAxes);
        }

        if (prevShowAxesLabels !== props.showAxesLabels) {
            if (props.showAxesLabels) {
                esvController.showAxisLabels();
            } else {
                esvController.hideAxisLabels();
            }
            setPrevShowAxesLabels(props.showAxesLabels);
        }

        if (!isEqual(prevZFactor, props.zFactor)) {
            esvController.zoomPanHandler.zFactor = props.zFactor ?? 1;
            setPrevZFactor(props.zFactor);
        }

        if (!isEqual(prevContainerSize, containerSize)) {
            esvController.adjustToSize(containerSize.width, containerSize.height);
            const size = {
                width: esvController.currentStateAsEvent.width,
                height: esvController.currentStateAsEvent.height,
            };
            if (pixiRenderApplication.renderer) {
                pixiRenderApplication.renderer.resize(size.width, size.height);
                pixiRenderApplication.render();
            }
            for (const layerId of layerIds ?? []) {
                const layer = esvController.getLayer(layerId);
                layer?.element?.setAttribute("width", size.width.toString());
                layer?.element?.setAttribute("height", size.height.toString());
            }
            const gridLayer = esvController.getLayer("grid");
            gridLayer?.element?.setAttribute("width", size.width.toString());
            gridLayer?.element?.setAttribute("height", size.height.toString());
            setPrevContainerSize(containerSize);
        }

        if (!isEqual(prevBounds, props.bounds)) {
            if (props.bounds?.x && props.bounds?.y) {
                esvController.setBounds(props.bounds.x, props.bounds.y);
            }
            setPrevBounds(props.bounds);
        }

        if (!isEqual(prevViewport, props.viewport)) {
            if (props.viewport) {
                esvController.setViewport(...props.viewport);
            }
            setPrevViewport(props.viewport);
        }

        if (!isEqual(prevLayers, props.layers)) {
            let newLayerIds = layerIds;

            // Remove layers that are not in the new list
            if (prevLayers) {
                for (const layer of prevLayers) {
                    if (!props.layers?.find((el) => el.id === layer.id)) {
                        newLayerIds = newLayerIds.filter((el) => el !== layer.id);
                        esvController.removeLayer(layer.id);
                        interactionHandler.removeLayer(layer.id);
                    }
                }
            }

            // Add or update layers
            if (props.layers) {
                for (const layer of props.layers) {
                    if (!esvController.getLayer(layer.id)) {
                        const newLayer = makeLayer(layer.type, layer.id, layer.options, pixiRenderApplication);
                        newLayerIds.push(layer.id);
                        esvController.addLayer(newLayer);
                        newLayer?.element?.setAttribute("width", containerSize.width.toString());
                        newLayer?.element?.setAttribute("height", containerSize.height.toString());
                        if (layer.hoverable) {
                            interactionHandler.addLayer(newLayer);
                        }
                    } else {
                        const existingLayer = esvController.getLayer(layer.id);
                        if (existingLayer) {
                            existingLayer.onUpdate({ data: layer.options.data });
                            interactionHandler.removeLayer(layer.id);
                            if (layer.hoverable) {
                                interactionHandler.addLayer(existingLayer);
                            }
                        }
                    }
                }
            }

            setLayerIds(newLayerIds);
            setPrevLayers(props.layers);
        }
    }

    React.useEffect(
        function handleMount() {
            if (!containerRef.current) {
                return;
            }

            const newEsvController = new Controller({
                container: containerRef.current,
                axisOptions: {
                    xLabel: "",
                    yLabel: "",
                    unitOfMeasure: "",
                },
            });

            const gridLayer = new GridLayer("grid");
            newEsvController.addLayer(gridLayer);
            newEsvController.hideLayer("grid");

            const newInteractionHandler = new InteractionHandler(newEsvController, containerRef.current, {
                intersectionOptions: {
                    threshold: 10,
                },
            });

            function handleReadoutItemsChange(
                payload: InteractionHandlerTopicPayload[InteractionHandlerTopic.READOUT_ITEMS_CHANGE]
            ) {
                if (onHover) {
                    onHover({ readoutItems: payload.items });
                }
            }

            newInteractionHandler.subscribe(InteractionHandlerTopic.READOUT_ITEMS_CHANGE, handleReadoutItemsChange);

            const newPixiRenderApplication = new PixiRenderApplication({
                context: null,
                antialias: true,
                hello: false,
                powerPreference: "default",
                premultipliedAlpha: false,
                preserveDrawingBuffer: false,
                backgroundColor: "#fff",
                clearBeforeRender: true,
                backgroundAlpha: 0,
            });

            setEsvController(newEsvController);
            setInteractionHandler(newInteractionHandler);
            setPixiRenderApplication(newPixiRenderApplication);

            return function handleUnmount() {
                setEsvController(null);
                setInteractionHandler(null);
                setLayerIds([]);
                setPrevLayers([]);
                setPrevAxesOptions(null);
                setPrevIntersectionReferenceSystem(null);
                setPrevShowGrid(null);
                setPrevContainerSize(null);
                setPrevBounds(null);
                setPrevViewport(null);
                setPrevShowAxesLabels(null);
                setPrevShowAxes(null);
                newPixiRenderApplication.destroy();
                newEsvController.removeAllLayers();
                newEsvController.destroy();
                newInteractionHandler.destroy();
            };
        },
        [onHover]
    );

    return (
        <>
            <div
                ref={containerRef}
                className={resolveClassNames({ "w-full h-full": props.size === undefined })}
                style={props.size}
            ></div>
        </>
    );
}
