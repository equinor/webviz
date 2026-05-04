import React from "react";

import { useAtom, useAtomValue } from "jotai";
import { cloneDeep, isEqual } from "lodash";

import type { ViewContext } from "@framework/ModuleContext";
import { SyncSettingKey, useRefStableSyncSettingsHelper } from "@framework/SyncSettings";
import type { Viewport } from "@framework/types/viewport";
import type { WorkbenchServices } from "@framework/WorkbenchServices";
import type { Bounds } from "@modules/_shared/components/EsvIntersection";
import { isValidNumber, isValidViewport } from "@modules/_shared/components/EsvIntersection/utils/validationUtils";
import type { Interfaces } from "@modules/Intersection/interfaces";

import { unlinkedViewStateMapAtom } from "../atoms/baseAtoms";
import type { ViewLinkResult } from "../components/ViewLinkManager";

const DISPLACEMENT_FACTOR = 1.4;

export type UseViewportStateProps = {
    /** The view being controlled */
    viewId: string;
    /** The descriptor of how this view connects to other views  */
    viewLinkResult: ViewLinkResult;
    /** The bounds of the views data  */
    layerItemsBounds: Bounds;
    /** The bounds of the view's relevant for focus-fit */
    focusBounds: Bounds | null;
    /** The size of the view element */
    containerSize: { width: number; height: number };
    /** Whether the viewport should automatically update as the focus bounds change */
    autofit: boolean;

    workbenchServices: WorkbenchServices;
    viewContext: ViewContext<Interfaces>;
};

export type ViewportState = {
    viewport: Viewport | null;
    effectiveVerticalScale: number;
    effectiveLayerItemsBounds: Bounds;
    updateViewport: (newViewport: Viewport) => void;
    updateVerticalScale: (newScale: number) => void;
    handleFitInView: () => void;
};

/**
 * Sets up state variables for controlling the viewport of a view that might be linked together with another
 */
export function useViewportState(props: UseViewportStateProps): ViewportState {
    const {
        viewId,
        viewLinkResult,
        layerItemsBounds,
        focusBounds,
        containerSize,
        workbenchServices,
        viewContext,
        autofit,
    } = props;

    const {
        isLinked,
        viewport: linkedViewport,
        viewportSourceViewId: linkedViewportSourceViewId,
        verticalScale: linkedVerticalScale,
        focusBounds: linkedFocusBounds,
        bounds: linkedBounds,
        onLinkedViewportChange,
        onLinkedVerticalScaleChange,
        onLinkedBoundsChange,
    } = viewLinkResult;

    // --- Source of truth for viewport ---
    const [unlinkedViewStateMap, setUnlinkedViewStateMap] = useAtom(unlinkedViewStateMapAtom);
    const unlinkedViewState = unlinkedViewStateMap?.[viewId] ?? null;

    const viewport = useViewport(viewId, viewLinkResult);

    const lastPublishedViewportRef = React.useRef<Viewport | null>(null);
    const lastAppliedSyncedViewportRef = React.useRef<Viewport | null>(null);

    const [verticalScale, setVerticalScale] = React.useState<number>(unlinkedViewState?.verticalScale ?? 10.0);
    const lastAppliedSyncedVerticalScaleRef = React.useRef<number | null>(null);

    // --- Sync settings ---
    const syncHelper = useRefStableSyncSettingsHelper({
        workbenchServices,
        moduleContext: viewContext,
    });

    const syncedCameraPosition = syncHelper.useValue(
        SyncSettingKey.CAMERA_POSITION_INTERSECTION,
        "global.syncValue.cameraPositionIntersection",
    );
    const syncedVerticalScale = syncHelper.useValue(SyncSettingKey.VERTICAL_SCALE, "global.syncValue.verticalScale");

    // --- Effective values (linked vs unlinked) ---
    const effectiveVerticalScale = isLinked && linkedVerticalScale !== null ? linkedVerticalScale : verticalScale;

    const candidateFocusBounds = isLinked && linkedFocusBounds ? linkedFocusBounds : focusBounds;
    const effectiveFocusBoundsRef = React.useRef<Bounds | null>(candidateFocusBounds);

    if (!isEqual(effectiveFocusBoundsRef.current, candidateFocusBounds)) {
        effectiveFocusBoundsRef.current = candidateFocusBounds;
    }
    const effectiveFocusBounds = effectiveFocusBoundsRef.current;

    const candidateLayerItemsBounds = isLinked && linkedBounds ? linkedBounds : layerItemsBounds;
    const effectiveLayerItemsBoundsRef = React.useRef<Bounds>(candidateLayerItemsBounds);
    if (!isEqual(effectiveLayerItemsBoundsRef.current, candidateLayerItemsBounds)) {
        effectiveLayerItemsBoundsRef.current = candidateLayerItemsBounds;
    }
    const effectiveLayerItemsBounds = effectiveLayerItemsBoundsRef.current;

    const verticalScalingFactor = React.useMemo(() => {
        let widthHeightRatio = containerSize.width / containerSize.height;
        widthHeightRatio = isValidNumber(widthHeightRatio) ? widthHeightRatio : 1.0;
        return widthHeightRatio * effectiveVerticalScale;
    }, [containerSize, effectiveVerticalScale]);

    // --- Viewport write helper ---
    const updateViewport = React.useCallback(
        function updateViewport(newViewport: Viewport) {
            if (isLinked) {
                onLinkedViewportChange(newViewport);
            }
            setUnlinkedViewStateMap((prev) => {
                const existing = prev?.[viewId];
                if (existing && isEqual(existing.viewport, newViewport) && existing.verticalScale === verticalScale) {
                    return prev;
                }
                return { ...prev, [viewId]: { viewport: newViewport, verticalScale } };
            });
        },
        [isLinked, viewId, verticalScale, onLinkedViewportChange, setUnlinkedViewStateMap],
    );

    const updateVerticalScale = React.useCallback(
        function updateVerticalScale(newScale: number): void {
            setVerticalScale(newScale);
            if (isLinked) {
                onLinkedVerticalScaleChange(newScale);
            }
            workbenchServices.publishGlobalData(
                "global.syncValue.verticalScale",
                newScale,
                viewContext.getInstanceIdString(),
            );
        },
        [isLinked, onLinkedVerticalScaleChange, viewContext, workbenchServices],
    );

    const handleFitInView = React.useCallback(
        function handleFitInView() {
            if (!effectiveFocusBoundsRef.current) return;

            let [xMin, xMax] = effectiveFocusBoundsRef.current.x;
            let [yMin, yMax] = effectiveFocusBoundsRef.current.y;

            if (!isValidNumber(xMin)) xMin = 0;
            if (!isValidNumber(xMax)) xMax = 0;
            if (!isValidNumber(yMin)) yMin = 0;
            if (!isValidNumber(yMax)) yMax = 0;

            const centerX = xMin + (xMax - xMin) / 2;
            const centerY = yMin + (yMax - yMin) / 2;
            const newViewport: [number, number, number] = [
                centerX,
                centerY,
                Math.max(xMax - xMin, (yMax - yMin) * verticalScalingFactor) * DISPLACEMENT_FACTOR,
            ];
            updateViewport(newViewport);
        },
        [updateViewport, verticalScalingFactor],
    );

    // --- Effects ---

    // Push viewport to link when a new link is created with no shared viewport yet
    React.useEffect(
        function syncViewportOnNewLink() {
            if (
                isLinked &&
                !linkedViewport &&
                linkedViewportSourceViewId === viewId &&
                viewport &&
                isValidViewport(viewport)
            ) {
                onLinkedViewportChange(viewport);
            }
        },
        [isLinked, linkedViewport, linkedViewportSourceViewId, viewId, viewport, onLinkedViewportChange],
    );

    // Report bounds to link
    React.useEffect(
        function reportBoundsToLink() {
            if (isLinked) {
                onLinkedBoundsChange(layerItemsBounds);
            }
        },
        [isLinked, layerItemsBounds, onLinkedBoundsChange],
    );

    // Sync viewport from global sync setting.
    // Linked views receive viewport through the link, so they skip global sync reception.
    React.useEffect(
        function syncLocalViewportFromGlobal() {
            if (isLinked) {
                // Keep the ref in sync so we don't stale-apply when unlinking
                if (syncedCameraPosition && isValidViewport(syncedCameraPosition)) {
                    lastAppliedSyncedViewportRef.current = cloneDeep(syncedCameraPosition);
                }
                return;
            }
            if (!syncedCameraPosition || !isValidViewport(syncedCameraPosition)) {
                return;
            }
            if (isEqual(syncedCameraPosition, lastAppliedSyncedViewportRef.current)) {
                return;
            }
            lastAppliedSyncedViewportRef.current = cloneDeep(syncedCameraPosition);
            updateViewport(syncedCameraPosition);
        },
        [isLinked, syncedCameraPosition, updateViewport],
    );

    // Sync vertical scale from global sync setting
    React.useEffect(
        function syncLocalVerticalScaleFromGlobal() {
            if (syncedVerticalScale === null) {
                return;
            }
            if (syncedVerticalScale === lastAppliedSyncedVerticalScaleRef.current) {
                return;
            }
            lastAppliedSyncedVerticalScaleRef.current = syncedVerticalScale;
            setVerticalScale((prev) => (prev === syncedVerticalScale ? prev : syncedVerticalScale));
        },
        [syncedVerticalScale],
    );

    // Publish viewport to global sync setting.
    // Only the source view publishes — linked follower views skip to avoid a feedback loop.
    React.useEffect(
        function publishViewportToGlobalSync() {
            if (!viewport || !isValidViewport(viewport)) {
                return;
            }
            if (isLinked && linkedViewportSourceViewId !== null && linkedViewportSourceViewId !== viewId) {
                // Keep the ref in sync so we don't stale-publish when unlinking
                lastPublishedViewportRef.current = cloneDeep(viewport);
                return;
            }
            if (isEqual(viewport, lastPublishedViewportRef.current)) {
                return;
            }
            lastPublishedViewportRef.current = cloneDeep(viewport);
            workbenchServices.publishGlobalData(
                "global.syncValue.cameraPositionIntersection",
                viewport,
                viewContext.getInstanceIdString(),
            );
        },
        [viewport, isLinked, linkedViewportSourceViewId, viewId, workbenchServices, viewContext],
    );

    // --- Refocus logic ---

    // Only automatically focus when focus bounds changes
    React.useEffect(() => {
        if (effectiveFocusBounds && autofit) {
            handleFitInView();
        }
    }, [autofit, effectiveFocusBounds, handleFitInView]);

    return {
        viewport,
        effectiveVerticalScale,
        effectiveLayerItemsBounds,
        updateViewport,
        updateVerticalScale,
        handleFitInView,
    };
}

/**
 * Gets a view's active viewport (either the view's own viewport, or the one shared for linked views )
 * @param viewId Intersection view id
 * @param viewLinkResult View link information for this view
 * @returns The currently relevant viewport for the view
 */
export function useViewport(viewId: string, viewLinkResult: ViewLinkResult): Viewport | null {
    const unlinkedViewStateMap = useAtomValue(unlinkedViewStateMapAtom);

    // TODO: If we simplify the link logic to write linked viewports to their atoms directly, this hook would only need to check the atom
    const unlinkedViewState = unlinkedViewStateMap?.[viewId] ?? null;
    const { isLinked, viewport: linkedViewport } = viewLinkResult;

    if (isLinked && linkedViewport) {
        return linkedViewport;
    }

    if (unlinkedViewState) {
        return unlinkedViewState.viewport;
    }

    return null;
}
