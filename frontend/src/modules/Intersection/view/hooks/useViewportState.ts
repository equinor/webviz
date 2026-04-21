import React from "react";

import { useAtom } from "jotai";
import { cloneDeep, isEqual } from "lodash";

import type { ViewContext } from "@framework/ModuleContext";
import { SyncSettingKey, useRefStableSyncSettingsHelper } from "@framework/SyncSettings";
import type { Viewport } from "@framework/types/viewport";
import type { WorkbenchServices } from "@framework/WorkbenchServices";
import type { Bounds } from "@modules/_shared/components/EsvIntersection";
import { FitInViewStatus } from "@modules/_shared/components/EsvIntersection/utilityComponents/Toolbar";
import {
    isValidBounds,
    isValidNumber,
    isValidViewport,
} from "@modules/_shared/components/EsvIntersection/utils/validationUtils";
import type { Interfaces } from "@modules/Intersection/interfaces";

import { unlinkedViewStateMapAtom } from "../atoms/baseAtoms";
import type { ViewLinkResult } from "../components/ViewLinkManager";

const DISPLACEMENT_FACTOR = 1.4;

export type UseViewportStateProps = {
    viewId: string;
    viewLinkResult: ViewLinkResult;
    layerItemsBounds: Bounds;
    focusBounds: Bounds | null;
    doRefocus: boolean;
    containerSize: { width: number; height: number };
    workbenchServices: WorkbenchServices;
    viewContext: ViewContext<Interfaces>;
    onViewportRefocused?: () => void;
};

export type ViewportState = {
    viewport: Viewport | null;
    effectiveVerticalScale: number;
    effectiveLayerItemsBounds: Bounds;
    fitInViewStatus: FitInViewStatus;
    showGrid: boolean;
    updateViewport: (newViewport: Viewport) => void;
    updateVerticalScale: (newScale: number) => void;
    setFitInViewStatus: (mode: FitInViewStatus) => void;
    setShowGrid: (active: boolean) => void;
    handleFitInViewToggle: (mode: FitInViewStatus) => void;
};

export function useViewportState(props: UseViewportStateProps): ViewportState {
    const {
        viewId,
        viewLinkResult,
        layerItemsBounds,
        focusBounds,
        doRefocus,
        containerSize,
        workbenchServices,
        viewContext,
        onViewportRefocused,
    } = props;

    const {
        isLinked,
        viewport: linkedViewport,
        viewportSourceViewId: linkedViewportSourceViewId,
        verticalScale: linkedVerticalScale,
        fitInViewStatus: linkedFitInViewStatus,
        focusBounds: linkedFocusBounds,
        bounds: linkedBounds,
        onLinkedViewportChange,
        onLinkedVerticalScaleChange,
        onLinkedBoundsChange,
        onLinkedFitInViewStatusChange,
    } = viewLinkResult;

    // --- Source of truth for viewport ---
    const [unlinkedViewStateMap, setUnlinkedViewStateMap] = useAtom(unlinkedViewStateMapAtom);
    const unlinkedViewState = unlinkedViewStateMap?.[viewId] ?? null;

    const viewport: Viewport | null =
        isLinked && linkedViewport ? linkedViewport : (unlinkedViewState?.viewport ?? null);

    const hasPersistedViewport = viewport !== null && isValidViewport(viewport);

    // --- Local state ---
    const [prevFocusBounds, setPrevFocusBounds] = React.useState<Bounds | null>(null);
    const lastPublishedViewportRef = React.useRef<Viewport | null>(null);
    const lastAppliedSyncedViewportRef = React.useRef<Viewport | null>(null);
    const skipRefocusDueToRestoreRef = React.useRef(hasPersistedViewport);

    const [verticalScale, setVerticalScale] = React.useState<number>(unlinkedViewState?.verticalScale ?? 10.0);
    const lastAppliedSyncedVerticalScaleRef = React.useRef<number | null>(null);

    const [localFitInViewStatus, setLocalFitInViewStatus] = React.useState<FitInViewStatus>(
        hasPersistedViewport ? FitInViewStatus.OFF : FitInViewStatus.ON,
    );

    const fitInViewStatus = isLinked && linkedFitInViewStatus !== null ? linkedFitInViewStatus : localFitInViewStatus;

    const setFitInViewStatus = React.useCallback(
        function setFitInViewStatus(status: FitInViewStatus) {
            setLocalFitInViewStatus(status);
            if (isLinked) {
                onLinkedFitInViewStatusChange(status);
            }
        },
        [isLinked, onLinkedFitInViewStatusChange],
    );

    const [showGrid, setShowGrid] = React.useState<boolean>(true);

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
    const effectiveFocusBounds = isLinked && linkedFocusBounds ? linkedFocusBounds : focusBounds;
    const effectiveLayerItemsBounds = isLinked && linkedBounds ? linkedBounds : layerItemsBounds;

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

    // Sync viewport from global sync setting
    React.useEffect(
        function syncLocalViewportFromGlobal() {
            if (!syncedCameraPosition || !isValidViewport(syncedCameraPosition)) {
                return;
            }
            if (isEqual(syncedCameraPosition, lastAppliedSyncedViewportRef.current)) {
                return;
            }
            lastAppliedSyncedViewportRef.current = cloneDeep(syncedCameraPosition);
            updateViewport(syncedCameraPosition);
        },
        [syncedCameraPosition, updateViewport],
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

    // Publish viewport to global sync setting
    React.useEffect(
        function publishViewportToGlobalSync() {
            if (!viewport || !isValidViewport(viewport)) {
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
        [viewport, workbenchServices, viewContext],
    );

    // --- Refocus logic ---

    const refocusViewport = React.useCallback(
        function refocusViewport(): void {
            if (!effectiveFocusBounds) {
                return;
            }
            const candidateViewport: Viewport = [
                effectiveFocusBounds.x[0] + (effectiveFocusBounds.x[1] - effectiveFocusBounds.x[0]) / 2,
                effectiveFocusBounds.y[0] + (effectiveFocusBounds.y[1] - effectiveFocusBounds.y[0]) / 2,
                Math.max(
                    effectiveFocusBounds.x[1] - effectiveFocusBounds.x[0],
                    (effectiveFocusBounds.y[1] - effectiveFocusBounds.y[0]) * verticalScalingFactor,
                ) * DISPLACEMENT_FACTOR,
            ];

            if (isValidViewport(candidateViewport) && !isEqual(candidateViewport, viewport)) {
                updateViewport(candidateViewport);
                onViewportRefocused?.();
            }
        },
        [effectiveFocusBounds, verticalScalingFactor, viewport, updateViewport, onViewportRefocused],
    );

    React.useEffect(
        function handleRefocus() {
            if (skipRefocusDueToRestoreRef.current) {
                if (doRefocus) {
                    skipRefocusDueToRestoreRef.current = false;
                    onViewportRefocused?.();
                }
                return;
            }
            if (!effectiveFocusBounds || !isValidBounds(effectiveFocusBounds)) return;
            if (fitInViewStatus === FitInViewStatus.ON || doRefocus) {
                refocusViewport();
            }
        },
        [containerSize, fitInViewStatus, effectiveFocusBounds, doRefocus, refocusViewport, onViewportRefocused],
    );

    React.useEffect(
        function handleFocusBoundsChange() {
            if (skipRefocusDueToRestoreRef.current) return;
            if (!isEqual(effectiveFocusBounds, prevFocusBounds)) {
                setPrevFocusBounds(cloneDeep(effectiveFocusBounds));

                if (effectiveFocusBounds && fitInViewStatus === FitInViewStatus.ON) {
                    refocusViewport();
                }
            }
        },
        [effectiveFocusBounds, fitInViewStatus, prevFocusBounds, refocusViewport],
    );

    // --- Handlers ---

    const handleFitInViewToggle = React.useCallback(
        function handleFitInViewToggle(mode: FitInViewStatus): void {
            setFitInViewStatus(mode);

            if (mode === FitInViewStatus.ON && effectiveFocusBounds) {
                let [xMin, xMax] = effectiveFocusBounds.x;
                let [yMin, yMax] = effectiveFocusBounds.y;

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
            }
        },
        [effectiveFocusBounds, verticalScalingFactor, updateViewport, setFitInViewStatus],
    );

    return {
        viewport,
        effectiveVerticalScale,
        effectiveLayerItemsBounds,
        fitInViewStatus,
        showGrid,
        updateViewport,
        updateVerticalScale,
        setFitInViewStatus,
        setShowGrid,
        handleFitInViewToggle,
    };
}
