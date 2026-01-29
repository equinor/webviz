import React from "react";

import { FilterContext, Layer, Viewport } from "@deck.gl/core";
import { DeckGLRef } from "@deck.gl/react";
import { Rect2D, rectContainsPoint } from "@lib/utils/geometry";
import {
    PublishSubscribe,
    PublishSubscribeDelegate,
    usePublishSubscribeTopicValue,
} from "@lib/utils/PublishSubscribeDelegate";

import { isEqual } from "lodash";

import { Vec2 } from "./utils/definitions";
import { mixVec2 } from "./utils/helpers";
import {
    AnnotationInstance,
    AnnotationInstanceState,
    BaseAnnotation,
    LabelAnnotation,
    PieChartAnnotation,
} from "./utils/types";
import { postProcessInstances, preprocessInstances, updateInstanceDOMElements } from "./utils/updateAnnotations";

export type AnnotationOrganizerParams = {
    labelOffset?: number;
    distanceFactor?: number;
    minDistance?: number;
    maxDistance?: number;
    anchorOcclusionRadius?: number;
    anchorSize?: number;
    anchorColor?: string;
    connectorWidth?: number;
    connectorColor?: string;
};

const defaultAnnotationOrganizerProps: Required<AnnotationOrganizerParams> = {
    labelOffset: 15,
    distanceFactor: 100,
    minDistance: 0, // No minimum distance constraint
    maxDistance: 0, // No maximum distance constraint (0 = disabled)
    anchorOcclusionRadius: 10,
    anchorSize: 2,
    anchorColor: "black",
    connectorWidth: 1,
    connectorColor: "black",
};

export enum AnnotationOrganizerTopic {
    INSTANCES = "instances",
}

export type AnnotationOrganizerTopicPayloads = {
    [AnnotationOrganizerTopic.INSTANCES]: AnnotationInstance[];
};

export class AnnotationOrganizer implements PublishSubscribe<AnnotationOrganizerTopicPayloads> {
    private _annotationsMap: Map<string, BaseAnnotation[]> = new Map();
    private _annotationInstances: AnnotationInstance[] = [];
    private _params: Required<AnnotationOrganizerParams>;
    private _prevLayerIds: string[] = [];
    private _hoveredInstance: AnnotationInstance | null = null;

    private _publishSubscribeDelegate = new PublishSubscribeDelegate<AnnotationOrganizerTopicPayloads>();

    private _ref: DeckGLRef | null = null;

    constructor(params: AnnotationOrganizerParams) {
        this._params = {
            labelOffset: params.labelOffset ?? defaultAnnotationOrganizerProps.labelOffset,
            distanceFactor: params.distanceFactor ?? defaultAnnotationOrganizerProps.distanceFactor,
            minDistance: params.minDistance ?? defaultAnnotationOrganizerProps.minDistance,
            maxDistance: params.maxDistance ?? defaultAnnotationOrganizerProps.maxDistance,
            anchorOcclusionRadius:
                params.anchorOcclusionRadius ?? defaultAnnotationOrganizerProps.anchorOcclusionRadius,
            anchorSize: params.anchorSize ?? defaultAnnotationOrganizerProps.anchorSize,
            anchorColor: params.anchorColor ?? defaultAnnotationOrganizerProps.anchorColor,
            connectorWidth: params.connectorWidth ?? defaultAnnotationOrganizerProps.connectorWidth,
            connectorColor: params.connectorColor ?? defaultAnnotationOrganizerProps.connectorColor,
        };
    }

    layerInViewport(viewport: Viewport, layer: Layer<any>) {
        if (!this.isInitialized()) {
            return false;
        }

        const layerFilter = this._ref!.deck!.props.layerFilter;
        if (!layerFilter) {
            return true;
        }

        const context: FilterContext = {
            layer,
            viewport,
            isPicking: false,
            renderPass: "normal",
        };

        return layerFilter(context);
    }

    getRef() {
        return this._ref;
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<AnnotationOrganizerTopicPayloads> {
        return this._publishSubscribeDelegate;
    }

    makeSnapshotGetter<T extends AnnotationOrganizerTopic.INSTANCES>(
        topic: T,
    ): () => AnnotationOrganizerTopicPayloads[T] {
        const snapshotGetter = (): any => {
            if (topic === AnnotationOrganizerTopic.INSTANCES) {
                return this._annotationInstances;
            }
        };
        return snapshotGetter;
    }

    setDeckRef(ref: DeckGLRef | null) {
        this._ref = ref;
    }

    getParams() {
        return this._params;
    }

    isInitialized() {
        return this._ref?.deck?.isInitialized;
    }

    getViewports() {
        if (!this.isInitialized()) {
            return [];
        }
        return this._ref!.deck!.getViewports();
    }

    getInstances() {
        return this._annotationInstances;
    }

    getAnnotationInstancesForLayer(layerId: string) {
        return this._annotationInstances.filter((instance) => instance.layerId === layerId);
    }

    removeOrphanedInstances(layerIds: string[]) {
        if (isEqual(layerIds, this._prevLayerIds)) {
            return;
        }

        console.debug("Removing orphaned instances");
        this._prevLayerIds = layerIds;
        for (const key of this._annotationsMap.keys()) {
            if (!layerIds.includes(key)) {
                this._annotationsMap.delete(key);
            }
        }

        this.updateAnnotationInstances();
    }

    private updateAnnotationInstances(): void {
        const instancesMap: Map<string, AnnotationInstance> = new Map(this._annotationInstances.map((i) => [i.id, i]));
        const instances: AnnotationInstance[] = [];

        const priorityRange = [0, 0];

        for (const [layerId, annotations] of this._annotationsMap) {
            for (const annotation of annotations) {
                const id = `${layerId}_${annotation.scope}_${annotation.id}`;

                const existingInstance = instancesMap.get(id);
                let instance: AnnotationInstance;

                if (existingInstance) {
                    // Check if position changed significantly - if so, reset animation state
                    const oldPos = existingInstance.annotation.position;
                    const newPos = annotation.position;
                    const positionChanged =
                        Math.abs(oldPos[0] - newPos[0]) > 0.001 ||
                        Math.abs(oldPos[1] - newPos[1]) > 0.001 ||
                        Math.abs(oldPos[2] - newPos[2]) > 0.001;

                    instance = {
                        ...existingInstance,
                        annotation: {
                            ...existingInstance.annotation,
                            ...annotation,
                        },
                    };

                    // Reset animation state if position changed
                    if (positionChanged) {
                        instance.state.kill = false;
                        instance.state.cooldown = 0;
                        instance.state.health = 0;
                        instance.state.visible = false;
                    }
                } else {
                    instance = {
                        id,
                        ref: React.createRef<HTMLDivElement>(),
                        layerId: layerId,
                        organizer: this,
                        annotation,
                        priority: 0,
                        rank: 0,
                        state: {
                            visible: false,
                            distance: Infinity,
                            health: 0,
                            labelWidth: 0,
                            labelHeight: 0,
                            screenPosition: [0, 0, 0],
                            zIndex: 0,
                            screenPositionCandidates: [],
                            screenPositionCandidatesLastIndex: 0,
                        },
                    };
                }

                instance.priority = annotation.priority ?? 0;
                priorityRange[0] = Math.min(priorityRange[0], instance.priority);
                priorityRange[1] = Math.max(priorityRange[1], instance.priority);

                instances.push(instance);
            }
        }

        const prioritySpan = Math.abs(priorityRange[1] - priorityRange[0]);

        instances.forEach((instance) => {
            instance.priority = prioritySpan > 0 ? (instance.priority - priorityRange[0]) / prioritySpan : 0;
        });

        this._annotationInstances = instances;

        this._publishSubscribeDelegate.notifySubscribers(AnnotationOrganizerTopic.INSTANCES);
    }

    registerAnnotations(layerId: string, annotations: BaseAnnotation[]) {
        console.debug("registerAnnotations", layerId, annotations);
        this._annotationsMap.set(layerId, annotations);
        this.updateAnnotationInstances();
    }

    handleAnnotationPointerOver(instance: AnnotationInstance) {
        instance.state.labelHovered = true;
        instance.state._needsUpdate = true;
        instance.annotation.onMouseOver?.();

        if (this._hoveredInstance && this._hoveredInstance !== instance) {
            this.handleAnnotationPointerOut(this._hoveredInstance);
        }

        this._hoveredInstance = instance;
    }

    handleAnnotationPointerOut(instance: AnnotationInstance) {
        instance.state.labelHovered = false;
        instance.state._needsUpdate = true;
        instance.annotation.onMouseOut?.();

        if (this._hoveredInstance === instance) {
            this._hoveredInstance = null;
        }
    }

    handleAnnotationPointerClick() {
        if (!this._hoveredInstance) {
            return;
        }

        this._hoveredInstance.state.boost = true;
        this._hoveredInstance.state._needsUpdate = true;

        this._hoveredInstance.annotation.onClick?.();
    }
}

export type UseAnnotationsProps = {
    organizer: AnnotationOrganizer;
    layers: Layer<any>[];
    maxVisibleAnnotations?: number;
};

let x1: number, x2: number, y1: number, y2: number;

export function useAnnotations(props: UseAnnotationsProps): [React.ReactNode, () => void] {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const instances = usePublishSubscribeTopicValue(props.organizer, AnnotationOrganizerTopic.INSTANCES);
    // Use ref instead of state to avoid re-renders on every mouse move
    const globalCursorRef = React.useRef<Vec2>([0, 0]);

    const deck = props.organizer.getRef()?.deck;
    const canvas = deck?.getCanvas();

    React.useEffect(() => {
        function handlePointerMove(event: PointerEvent) {
            // Update ref directly - no React re-render triggered
            globalCursorRef.current = [event.clientX, event.clientY];
        }

        function handlePointerDown() {
            props.organizer.handleAnnotationPointerClick();
        }

        document.addEventListener("pointermove", handlePointerMove);
        document.addEventListener("pointerdown", handlePointerDown);

        return () => {
            document.removeEventListener("pointermove", handlePointerMove);
            document.removeEventListener("pointerdown", handlePointerDown);
        };
    }, [props.organizer]);

    // Store layers in a ref to avoid recreating render callback when layers change
    const layersRef = React.useRef(props.layers);
    layersRef.current = props.layers;

    const maxVisibleRef = React.useRef(props.maxVisibleAnnotations ?? 100);
    maxVisibleRef.current = props.maxVisibleAnnotations ?? 100;

    const render = React.useCallback(
        function render() {
            const viewports = props.organizer.getViewports();
            const ctx = canvasRef.current?.getContext("2d");
            // Read instances directly from the organizer to avoid stale closures
            const currentInstances = props.organizer.getInstances();

            if (!ctx || !canvas || !canvasRef.current) {
                return;
            }

            const canvasBoundingRect = canvas.getBoundingClientRect();

            ctx.clearRect(0, 0, canvasRef.current.clientWidth, canvasRef.current.clientHeight);

            for (const viewport of viewports) {
                const size: Vec2 = [viewport.width, viewport.height];
                const offset: Vec2 = [viewport.x, viewport.y];

                const filtered = currentInstances.filter((i) => {
                    const layer = layersRef.current.find((l) => l.id === i.layerId);
                    // If no matching layer found, include the annotation anyway (e.g., pick annotations)
                    // If layer found, check if it's visible in this viewport
                    return !layer || props.organizer.layerInViewport(viewport, layer);
                });

                const cursor = [
                    globalCursorRef.current[0] - viewport.x - canvasBoundingRect.left,
                    globalCursorRef.current[1] - viewport.y - canvasBoundingRect.top,
                ];

                const inViewSpace = preprocessInstances(filtered, viewport, maxVisibleRef.current);

                if (!inViewSpace.length) {
                    updateInstanceDOMElements(currentInstances);
                    return;
                }

                postProcessInstances(inViewSpace, size, offset);

                // Maybe do some occlusion culling here
                updateInstanceDOMElements(currentInstances);

                const sorted = inViewSpace.toSorted((a, b) => b.rank - a.rank);

                for (const instance of sorted) {
                    if (instance.state.occluded || instance.state.capped) {
                        continue;
                    }

                    x1 = (instance.state.screenPosition[0] * 0.5 + 0.5) * size[0] + offset[0];
                    y1 = (-instance.state.screenPosition[1] * 0.5 + 0.5) * size[1] + offset[1];

                    let radius = instance.organizer.getParams().anchorSize * instance.state.scaleFactor!;
                    let anchorHovered = false;

                    if (instance.state.visible && instance.state.labelPosition) {
                        const rect: Rect2D = {
                            x: instance.state.labelPosition[0],
                            y: instance.state.labelPosition[1],
                            width: instance.state.labelWidth,
                            height: instance.state.labelHeight,
                        };

                        if (rectContainsPoint(rect, { x: cursor[0], y: cursor[1] })) {
                            if (!instance.state.labelHovered) {
                                instance.state.labelHovered = true;
                                instance.state._needsUpdate = true;
                            }
                        } else {
                            if (instance.state.labelHovered) {
                                instance.state.labelHovered = false;
                                instance.state._needsUpdate = true;
                            }
                        }
                    }

                    // boost instance if not visible and cursor is over anchor point
                    if (Math.abs(cursor[0] - x1) <= radius && Math.abs(cursor[1] - y1) <= radius) {
                        if (instance.state.visible) {
                            anchorHovered = true;
                        } else {
                            instance.state.boost = true;
                        }
                    }

                    if (instance.state.labelHovered || anchorHovered) {
                        radius *= 1.5;
                    }

                    if (instance.organizer.getParams().labelOffset > 0 && instance.state.visible) {
                        // connector
                        if (instance.state.inTransition && instance.state.prevAnchorPosition) {
                            [x2, y2] = mixVec2(
                                instance.state.prevAnchorPosition,
                                instance.state.anchorPosition!,
                                instance.state.transitionTime,
                            );
                        } else {
                            [x2, y2] = instance.state.anchorPosition!;
                        }

                        x2 += offset[0];
                        y2 += offset[1];

                        let strokeWidth = Math.max(
                            0.1,
                            instance.organizer.getParams().connectorWidth * instance.state.scaleFactor!,
                        );
                        if (instance.state.labelHovered || anchorHovered) {
                            strokeWidth *= 2;
                        }

                        ctx.globalAlpha = instance.state.opacity || 0;
                        ctx.beginPath();
                        ctx.moveTo(x1, y1);
                        ctx.lineTo(x2, y2);

                        ctx.strokeStyle = instance.organizer.getParams().connectorColor;
                        ctx.lineWidth = strokeWidth;
                        ctx.stroke();
                    }

                    // anchorpoint
                    ctx.beginPath();
                    ctx.arc(x1, y1, radius, 0, Math.PI * 2);

                    ctx.globalAlpha = instance.state.visible ? 1 : 0.5;
                    ctx.fillStyle = instance.organizer.getParams().anchorColor;

                    ctx.fill();

                    ctx.globalAlpha = instance.state.opacity || 0;
                    ctx.strokeStyle = "black";
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
        },
        // Only depend on stable references:
        // - props.organizer is stable (created once with useMemo)
        // - canvas changes when deck.gl initializes
        // - layers and maxVisibleAnnotations are read from refs at render time
        [props.organizer, canvas],
    );

    if (!props.organizer.isInitialized()) {
        return [null, render];
    }

    if (!canvas) {
        return [null, render];
    }

    // Use clientWidth/clientHeight for CSS dimensions, not canvas.width/height which are buffer dimensions
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    return [
        <div
            key="annotations"
            className="absolute inset-0 pointer-events-none"
            style={{ width, height }}
        >
            <AnnotationComponentsContainer organizer={props.organizer} width={width} height={height} />
            <canvas
                ref={canvasRef}
                className="absolute inset-0 pointer-events-none"
                width={width}
                height={height}
            />
        </div>,
        render,
    ];
}

export type AnnotationComponentsContainerProps = {
    organizer: AnnotationOrganizer;
    width: number;
    height: number;
};

export function AnnotationComponentsContainer(props: AnnotationComponentsContainerProps) {
    const instances = usePublishSubscribeTopicValue(props.organizer, AnnotationOrganizerTopic.INSTANCES);

    return (
        <div className="absolute inset-0 overflow-hidden" style={{ width: props.width, height: props.height }}>
            {instances.map((instance) => (
                <AnnotationComponent
                    key={instance.id}
                    id={instance.id}
                    annotation={instance.annotation}
                    ref={instance.ref}
                    state={instance.state}
                />
            ))}
        </div>
    );
}

type AnnotationComponentProps = {
    id: string;
    state: AnnotationInstanceState;
    annotation: BaseAnnotation;
};

const AnnotationComponentInner = React.forwardRef(
    (props: AnnotationComponentProps, ref: React.Ref<HTMLDivElement>) => {
        // Use refs to access mutable state without recreating callbacks
        const stateRef = React.useRef(props.state);
        stateRef.current = props.state;

        const annotationRef = React.useRef(props.annotation);
        annotationRef.current = props.annotation;

        // Stable callbacks that don't change on every render
        const onPointerEnter = React.useCallback(() => {
            stateRef.current.labelHovered = true;
            annotationRef.current.onMouseOver?.();
        }, []);

        const onPointerLeave = React.useCallback(() => {
            stateRef.current.labelHovered = false;
            annotationRef.current.onMouseOut?.();
        }, []);

        const onPointerClick = React.useCallback(() => {
            stateRef.current.boost = true;
        }, []);

        let cumulativePercent = 0;

        return (
            <div
                data-annotationid={props.id}
                ref={ref}
                className="absolute cursor-pointer"
                style={{
                    top: 0,
                    left: 0,
                    visibility: "hidden",
                    userSelect: "none",
                    pointerEvents: "none",
                }}
                onPointerEnter={onPointerEnter}
                onPointerLeave={onPointerLeave}
                onClick={onPointerClick}
            >
                {props.annotation.type === "label" && (
                    <div
                        key={props.id}
                        id={`annotation_${props.id}`}
                        style={{
                            minWidth: "100px",
                            background: "#000",
                            color: "white",
                            textAlign: "center",
                            overflow: "hidden",
                            borderRadius: "4px",
                            padding: "1px 2px",
                            fontFamily: "sans-serif",
                            fontSize: "10pt",
                        }}
                    >
                        <div style={{ whiteSpace: "nowrap" }}>{(props.annotation as LabelAnnotation).name}</div>
                    </div>
                )}
                {props.annotation.type === "pie-chart" && (
                    <div
                        key={props.id}
                        id={`annotation_${props.id}`}
                        style={{
                            minWidth: "24px",
                            border: "1px solid #000",
                            background: "#fff",
                            color: "white",
                            textAlign: "center",
                            overflow: "hidden",
                            borderRadius: "4px",
                            padding: "3px 3px",
                            fontFamily: "sans-serif",
                            fontSize: "10pt",
                        }}
                    >
                        <svg
                            height="24"
                            width="24"
                            viewBox="-1 -1 2 2"
                            style={{ transform: "rotate(-90deg)" }}
                            key={props.id}
                            id={`annotation_${props.id}`}
                        >
                            {(props.annotation as PieChartAnnotation).data.values.map((value: number, index: number) => {
                                const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
                                cumulativePercent += value;
                                const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
                                const largeArcFlag = value > 0.5 ? 1 : 0;
                                return (
                                    <path
                                        key={index}
                                        d={`M ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} L 0 0`}
                                        fill={(props.annotation as PieChartAnnotation).data.colors[index]}
                                    />
                                );
                            })}
                        </svg>
                    </div>
                )}
            </div>
        );
    },
);

AnnotationComponentInner.displayName = "AnnotationComponentInner";

// Memoize to prevent re-renders when only state changes (state is updated via direct DOM manipulation)
const AnnotationComponent = React.memo(AnnotationComponentInner, (prev, next) => {
    // Only re-render if id or annotation content changes
    // State changes are handled via direct DOM manipulation in updateInstanceDOMElements
    return prev.id === next.id && prev.annotation === next.annotation;
});

function getCoordinatesForPercent(percent: number): [number, number] {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
}
