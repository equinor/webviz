import React from "react";

import type { AxisOptions, IntersectionReferenceSystem } from "@equinor/esv-intersection";

import type { Viewport } from "@framework/types/viewport";
import { useElementSize } from "@lib/hooks/useElementSize";
import type { Size2D } from "@lib/utils/geometry";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { Bounds } from "./EsvIntersectionController";
import { EsvIntersectionController, EsvIntersectionControllerTopic } from "./EsvIntersectionController";
import type { EsvLayer } from "./EsvLayer";
import type { HighlightItem, ReadoutItem } from "./types/types";

export type { Bounds };

export type EsvIntersectionReadoutEvent = {
    readoutItems: ReadoutItem[];
};

export type EsvIntersectionProps = {
    size?: Size2D;
    showGrid?: boolean;
    axesOptions?: AxisOptions;
    showAxesLabels?: boolean;
    showAxes?: boolean;
    layers?: EsvLayer[];
    bounds?: Bounds;
    viewport?: Viewport;
    intersectionReferenceSystem?: IntersectionReferenceSystem;
    zFactor?: number;
    intersectionThreshold?: number;
    highlightItems?: HighlightItem[];
    onReadout?: (event: EsvIntersectionReadoutEvent) => void;
    onViewportChange?: (viewport: Viewport) => void;
    onMousePositionChange?: (position: { x: number; y: number } | null) => void;
};

const DEFAULT_PROPS = {
    showGrid: false,
    showAxes: false,
    showAxesLabels: false,
    zFactor: 1,
    intersectionThreshold: 10,
} satisfies Partial<EsvIntersectionProps>;

export function EsvIntersection(props: EsvIntersectionProps): React.ReactNode {
    const defaultedProps = { ...DEFAULT_PROPS, ...props };
    const { onReadout, onViewportChange, onMousePositionChange } = defaultedProps;

    const containerRef = React.useRef<HTMLDivElement>(null);
    const containerSize = useElementSize(containerRef);

    // Store the controller in a ref so it can be replaced synchronously in the
    // cleanup. React Strict Mode runs effect -> cleanup -> effect again before any
    // queued state update takes effect. If we used useState and created the new
    // controller in the cleanup via setState (async), the Strict Mode re-invocation
    // would see the destroyed instance and throw. With a ref the cleanup sets the
    // new instance immediately, so the next effect invocation picks it up.
    const controllerRef = React.useRef(new EsvIntersectionController());
    // Counter used only to trigger a re-render after the controller is replaced,
    // so pub/sub subscriptions and effect deps ([controller, ...]) move to the new one.
    const [, forceControllerUpdate] = React.useState(0);
    const controller = controllerRef.current;

    const readoutItems = usePublishSubscribeTopicValue(controller, EsvIntersectionControllerTopic.READOUT_ITEMS_CHANGE);
    const viewport = usePublishSubscribeTopicValue(controller, EsvIntersectionControllerTopic.VIEWPORT_CHANGE);
    const mousePosition = usePublishSubscribeTopicValue(
        controller,
        EsvIntersectionControllerTopic.MOUSE_POSITION_CHANGE,
    );

    // Keep refs to the latest callbacks so effects only re-run when the pub/sub
    // VALUE changes, not when the parent re-renders and creates a new callback
    // identity. Without this, a linked viewport update changes the parent's
    // callback identity, the effect re-fires with the controller's stale
    // _latestViewport, and the stale value propagates back — causing oscillation.
    const onReadoutRef = React.useRef(onReadout);
    onReadoutRef.current = onReadout;
    const onViewportChangeRef = React.useRef(onViewportChange);
    onViewportChangeRef.current = onViewportChange;
    const onMousePositionChangeRef = React.useRef(onMousePositionChange);
    onMousePositionChangeRef.current = onMousePositionChange;

    React.useEffect(
        function initializeController() {
            if (!containerRef.current) return;
            // Read from the ref each invocation — not a captured closure value —
            // so the Strict Mode re-mount initializes the fresh instance placed
            // here by the previous cleanup, not the already-destroyed original.
            const ctrl = controllerRef.current;
            ctrl.initialize(containerRef.current);
            return function destroyController() {
                ctrl.destroy();
                // Synchronous replacement: the next effect invocation (Strict Mode
                // re-mount or a real remount) will read this new instance from the ref.
                controllerRef.current = new EsvIntersectionController();
                // Schedule a re-render so [controller, ...] effects and pub/sub
                // subscriptions switch to the new instance.
                forceControllerUpdate((n) => n + 1);
            };
        },
        // containerRef and controllerRef are stable refs; forceControllerUpdate is a
        // stable setter — none need to be listed. Empty deps means this effect only
        // runs on mount/unmount (and the Strict Mode double-invoke), not on re-renders.

        [],
    );

    React.useEffect(() => {
        onReadoutRef.current?.({ readoutItems });
    }, [readoutItems]);
    React.useEffect(() => {
        if (viewport) onViewportChangeRef.current?.(viewport);
    }, [viewport]);
    React.useEffect(() => {
        onMousePositionChangeRef.current?.(mousePosition);
    }, [mousePosition]);

    React.useEffect(() => {
        controller.setLayers(defaultedProps.layers ?? []);
    }, [controller, defaultedProps.layers]);
    React.useEffect(() => {
        if (defaultedProps.viewport) controller.setViewport(defaultedProps.viewport);
    }, [controller, defaultedProps.viewport]);
    React.useEffect(() => {
        if (defaultedProps.bounds) controller.setBounds(defaultedProps.bounds);
    }, [controller, defaultedProps.bounds]);
    React.useEffect(() => {
        controller.setZFactor(defaultedProps.zFactor);
    }, [controller, defaultedProps.zFactor]);
    React.useEffect(() => {
        controller.setShowGrid(defaultedProps.showGrid);
    }, [controller, defaultedProps.showGrid]);
    React.useEffect(() => {
        controller.setShowAxes(defaultedProps.showAxes);
    }, [controller, defaultedProps.showAxes]);
    React.useEffect(() => {
        controller.setShowAxesLabels(defaultedProps.showAxesLabels);
    }, [controller, defaultedProps.showAxesLabels]);
    React.useEffect(() => {
        if (defaultedProps.axesOptions) controller.setAxesOptions(defaultedProps.axesOptions);
    }, [controller, defaultedProps.axesOptions]);
    React.useEffect(() => {
        if (defaultedProps.intersectionReferenceSystem)
            controller.setIntersectionReferenceSystem(defaultedProps.intersectionReferenceSystem);
    }, [controller, defaultedProps.intersectionReferenceSystem]);
    React.useEffect(() => {
        controller.setHighlightItems(defaultedProps.highlightItems ?? []);
    }, [controller, defaultedProps.highlightItems]);
    React.useEffect(() => {
        controller.setIntersectionThreshold(defaultedProps.intersectionThreshold);
    }, [controller, defaultedProps.intersectionThreshold]);

    React.useEffect(
        function handleResize() {
            if (containerSize.width && containerSize.height) {
                controller.adjustToSize(containerSize.width, containerSize.height);
            }
        },
        [controller, containerSize.width, containerSize.height],
    );

    const handleMouseMove = React.useCallback(
        function handleMouseMove(event: React.MouseEvent) {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            controller.notifyMouseMove(event.clientX - rect.left, event.clientY - rect.top);
        },
        [controller],
    );

    const handleMouseLeave = React.useCallback(
        function handleMouseLeave() {
            controller.notifyMouseLeave();
        },
        [controller],
    );

    return (
        <div
            ref={containerRef}
            className={resolveClassNames({ "w-full h-full": defaultedProps.size === undefined })}
            style={{ ...defaultedProps.size }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        />
    );
}
