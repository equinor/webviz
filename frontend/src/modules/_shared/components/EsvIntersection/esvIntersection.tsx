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
    OnRescaleEvent,
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
import { Viewport } from "@framework/types/viewport";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ColorScale } from "@lib/utils/ColorScale";
import { fuzzyCompare } from "@lib/utils/fuzzyCompare";
import { Size2D } from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { cloneDeep, isEqual } from "lodash";

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
import { SeismicLayer, SeismicLayerData } from "./layers/SeismicLayer";
import {
    SurfaceStatisticalFanchartsCanvasLayer,
    SurfaceStatisticalFanchartsData,
} from "./layers/SurfaceStatisticalFanchartCanvasLayer";
import { HighlightItem, ReadoutItem } from "./types/types";

export enum LayerType {
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

type LayerDataTypeMap = {
    [LayerType.CALLOUT_CANVAS]: Annotation[];
    [LayerType.GEOMODEL_CANVAS]: SurfaceData;
    [LayerType.GEOMODEL_LABELS]: SurfaceData;
    [LayerType.GEOMODEL_V2]: SurfaceData;
    [LayerType.IMAGE_CANVAS]: unknown;
    [LayerType.POLYLINE_INTERSECTION]: PolylineIntersectionData;
    [LayerType.REFERENCE_LINE]: ReferenceLine[];
    [LayerType.SCHEMATIC]: SchematicData;
    [LayerType.SEISMIC]: SeismicLayerData;
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
    [LayerType.SEISMIC]: LayerOptions<SeismicLayerData>;
    [LayerType.SEISMIC_CANVAS]: LayerOptions<SeismicCanvasData & { colorScale?: ColorScale }>;
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

export type ZoomTransform = { x: number; y: number; k: number };

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
    intersectionThreshold?: number;
    highlightItems?: HighlightItem[];
    onReadout?: (event: EsvIntersectionReadoutEvent) => void;
    onViewportChange?: (viewport: Viewport) => void;
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
        case LayerType.SEISMIC:
            return new SeismicLayer(id, options as LayerOptions<SeismicLayerData>) as unknown as Layer<
                LayerDataTypeMap[T]
            >;
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

function isPixiLayer(layer: Layer<unknown>): boolean {
    return (
        layer instanceof GeomodelLayerV2 ||
        layer instanceof SchematicLayer ||
        layer instanceof PolylineIntersectionLayer
    );
}

export function EsvIntersection(props: EsvIntersectionProps): React.ReactNode {
    const { onReadout, onViewportChange } = props;

    const [prevAxesOptions, setPrevAxesOptions] = React.useState<AxisOptions | undefined>(undefined);
    const [prevIntersectionReferenceSystem, setPrevIntersectionReferenceSystem] = React.useState<
        IntersectionReferenceSystem | null | undefined
    >(null);
    const [prevShowGrid, setPrevShowGrid] = React.useState<boolean | undefined>(undefined);
    const [prevLayers, setPrevLayers] = React.useState<LayerItem[] | undefined>(undefined);
    const [prevBounds, setPrevBounds] = React.useState<Bounds | undefined>(undefined);
    const [prevViewport, setPrevViewport] = React.useState<Viewport | undefined>(undefined);
    const [prevShowAxesLabels, setPrevShowAxesLabels] = React.useState<boolean | undefined>(undefined);
    const [prevShowAxes, setPrevShowAxes] = React.useState<boolean | undefined>(undefined);
    const [prevZFactor, setPrevZFactor] = React.useState<number | undefined>(undefined);
    const [prevHighlightItems, setPrevHighlightItems] = React.useState<HighlightItem[] | undefined>(undefined);

    const [layerIds, setLayerIds] = React.useState<string[]>([]);

    const [esvController, setEsvController] = React.useState<Controller | null>(null);
    const [interactionHandler, setInteractionHandler] = React.useState<InteractionHandler | null>(null);
    const [pixiRenderApplication, setPixiRenderApplication] = React.useState<PixiRenderApplication | null>(null);
    const [currentViewport, setCurrentViewport] = React.useState<Viewport | null>(null);

    const containerRef = React.useRef<HTMLDivElement>(null);
    const automaticChanges = React.useRef<boolean>(false);

    const containerSize = useElementSize(containerRef);

    if (esvController && interactionHandler && pixiRenderApplication) {
        if (
            !isEqual(prevIntersectionReferenceSystem, props.intersectionReferenceSystem) &&
            props.intersectionReferenceSystem
        ) {
            esvController.setReferenceSystem(props.intersectionReferenceSystem);
            setPrevIntersectionReferenceSystem(props.intersectionReferenceSystem);
            automaticChanges.current = true;
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

        if (!isEqual(prevHighlightItems, props.highlightItems)) {
            interactionHandler.setStaticHighlightItems(props.highlightItems ?? []);
            setPrevHighlightItems(props.highlightItems);
        }

        if (!isEqual(prevBounds, props.bounds)) {
            if (props.bounds?.x && props.bounds?.y) {
                esvController.setBounds(props.bounds.x, props.bounds.y);
            }
            setPrevBounds(props.bounds);
        }

        if (
            !isEqual(prevViewport, props.viewport) ||
            (prevViewport &&
                props.viewport &&
                (!fuzzyCompare(prevViewport[0], props.viewport[0], 0.0001) ||
                    !fuzzyCompare(prevViewport[1], props.viewport[1], 0.0001) ||
                    !fuzzyCompare(prevViewport[2], props.viewport[2], 0.0001)))
        ) {
            if (props.viewport) {
                if (
                    !currentViewport ||
                    !fuzzyCompare(currentViewport[0], props.viewport[0], 0.0001) ||
                    !fuzzyCompare(currentViewport[1], props.viewport[1], 0.0001) ||
                    !fuzzyCompare(currentViewport[2], props.viewport[2], 0.0001)
                ) {
                    automaticChanges.current = true;
                    esvController.setViewport(...props.viewport);
                    setCurrentViewport(props.viewport);
                }
            }
            setPrevViewport(props.viewport);
        }

        if (!isEqual(prevLayers, props.layers)) {
            let newLayerIds = layerIds;
            automaticChanges.current = true;

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
                        const newLayerOptions = cloneDeep(layer.options);
                        // Grid layer has order 1 and should not be considered when setting order for other layers
                        // Hence, the internal order of the new layer is increased by 1
                        if (newLayerOptions.order !== undefined) {
                            newLayerOptions.order = newLayerOptions.order + 1;
                        }
                        const newLayer = makeLayer(layer.type, layer.id, newLayerOptions, pixiRenderApplication);
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
                            // The last pixi layer does always hold the canvas element. If the last layer is removed and the other pixi layers are only updated,
                            // they don't have a canvas to draw to anymore. Hence, in order to add a new canvas, the old layer gets removed and a new one added.
                            if (isPixiLayer(existingLayer)) {
                                esvController.removeLayer(layer.id);
                                const newLayerOptions = cloneDeep(layer.options);
                                if (newLayerOptions.order !== undefined) {
                                    newLayerOptions.order = newLayerOptions.order + 1;
                                }
                                const newLayer = makeLayer(
                                    layer.type,
                                    layer.id,
                                    newLayerOptions,
                                    pixiRenderApplication
                                );
                                esvController.addLayer(newLayer);
                            } else {
                                existingLayer.onUpdate({ data: cloneDeep(layer.options.data) });
                                if (layer.options.order !== undefined) {
                                    existingLayer.order = layer.options.order + 1;
                                }
                                existingLayer?.element?.setAttribute("width", containerSize.width.toString());
                                existingLayer?.element?.setAttribute("height", containerSize.height.toString());
                            }
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

            const oldOnRescaleFunction = newEsvController.zoomPanHandler.onRescale;

            newEsvController.zoomPanHandler.onRescale = function handleRescale(event: OnRescaleEvent) {
                if (!automaticChanges.current) {
                    const k = event.transform.k;
                    const xSpan = newEsvController.zoomPanHandler.xSpan;
                    const displ = xSpan / k;
                    const unitsPerPixel = displ / event.width;

                    const dx0 = event.xBounds[0] - event.transform.x * unitsPerPixel;
                    const cx = dx0 + displ / 2;

                    const dy0 = event.yBounds[0] - event.transform.y * (unitsPerPixel / event.zFactor);
                    const cy = dy0 + displ / event.zFactor / event.viewportRatio / 2;

                    setCurrentViewport([cx, cy, displ]);
                }
                automaticChanges.current = false;
                oldOnRescaleFunction(event);
            };

            const gridLayer = new GridLayer("grid", {
                order: 1,
            });
            newEsvController.addLayer(gridLayer);
            newEsvController.hideLayer("grid");

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
            setPixiRenderApplication(newPixiRenderApplication);

            const newInteractionHandler = new InteractionHandler(newEsvController, containerRef.current, {
                intersectionOptions: {
                    threshold: props.intersectionThreshold ?? 10,
                },
            });

            setInteractionHandler(newInteractionHandler);

            return function handleUnmount() {
                setEsvController(null);
                setLayerIds([]);
                setPrevLayers([]);
                setPrevAxesOptions(undefined);
                setPrevIntersectionReferenceSystem(null);
                setPrevShowGrid(undefined);
                setPrevBounds(undefined);
                setPrevViewport(undefined);
                setPrevShowAxesLabels(undefined);
                setPrevShowAxes(undefined);
                setInteractionHandler(null);
                newInteractionHandler.destroy();
                newEsvController.removeAllLayers();
                newEsvController.destroy();
            };
        },
        [props.intersectionThreshold]
    );

    React.useEffect(
        function handleReadoutFunctionChange() {
            if (!interactionHandler) {
                return;
            }

            function handleReadoutItemsChange(
                payload: InteractionHandlerTopicPayload[InteractionHandlerTopic.READOUT_ITEMS_CHANGE]
            ) {
                if (onReadout) {
                    onReadout({ readoutItems: payload.items });
                }
            }

            const unsubscribe = interactionHandler.subscribe(
                InteractionHandlerTopic.READOUT_ITEMS_CHANGE,
                handleReadoutItemsChange
            );

            return function handleRemoveReadoutFunction() {
                unsubscribe();
            };
        },
        [onReadout, interactionHandler]
    );

    React.useEffect(
        function propagateViewportChange() {
            if (onViewportChange && currentViewport) {
                onViewportChange(currentViewport);
                setPrevViewport(currentViewport);
            }
        },
        [currentViewport, onViewportChange]
    );

    React.useEffect(
        function handleResize() {
            if (esvController && containerSize.width && containerSize.height) {
                esvController.adjustToSize(containerSize.width, containerSize.height);
                const size = {
                    width: esvController.currentStateAsEvent.width,
                    height: esvController.currentStateAsEvent.height,
                };
                if (pixiRenderApplication?.renderer) {
                    pixiRenderApplication.renderer.resize(size.width, size.height);
                    pixiRenderApplication.render();
                }
                const gridLayer = esvController.getLayer("grid");
                gridLayer?.element?.setAttribute("width", size.width.toString());
                gridLayer?.element?.setAttribute("height", size.height.toString());
            }
        },
        [containerSize.width, containerSize.height, esvController, pixiRenderApplication]
    );

    return (
        <>
            <div
                ref={containerRef}
                className={resolveClassNames({ "w-full h-full": props.size === undefined })}
                style={{ ...props.size }}
            ></div>
        </>
    );
}
