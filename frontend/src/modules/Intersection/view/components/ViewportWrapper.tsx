import React from "react";

import type { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { cloneDeep, isEqual } from "lodash";

import type { HoverService } from "@framework/HoverService";
import type { ViewContext } from "@framework/ModuleContext";
import { SyncSettingKey, useRefStableSyncSettingsHelper } from "@framework/SyncSettings";
import type { Viewport } from "@framework/types/viewport";
import type { WorkbenchServices } from "@framework/WorkbenchServices";
import { useElementSize } from "@lib/hooks/useElementSize";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { ColorLegendsContainer } from "@modules/_shared/components/ColorLegendsContainer";
import type { ColorScaleWithId } from "@modules/_shared/components/ColorLegendsContainer/colorScaleWithId";
import type { Bounds, LayerItem } from "@modules/_shared/components/EsvIntersection";
import { FitInViewStatus, Toolbar } from "@modules/_shared/components/EsvIntersection/utilityComponents/Toolbar";
import {
    isValidBounds,
    isValidNumber,
    isValidViewport,
} from "@modules/_shared/components/EsvIntersection/utils/validationUtils";
import { ViewportLabel } from "@modules/_shared/components/ViewportLabel";
import type { IntersectionSettingValue } from "@modules/_shared/DataProviderFramework/settings/implementations/IntersectionSetting";
import type { Interfaces } from "@modules/Intersection/interfaces";

import { ReadoutWrapper } from "./ReadoutWrapper";
import { useViewLinkResult } from "./ViewLinkManager";

const DISPLACEMENT_FACTOR = 1.4; // Factor to increase the viewport displacement when fitting in view

export type ViewportWrapperProps = {
    viewId: string;
    name: string;
    color: string | null;
    intersectionSource: IntersectionSettingValue | null;
    referenceSystem?: IntersectionReferenceSystem;
    layerItems: LayerItem[];
    layerItemIdToNameMap: Record<string, string>;
    layerItemsBounds: Bounds;
    focusBounds: Bounds | null;
    doRefocus: boolean;
    colorScales: ColorScaleWithId[];
    workbenchServices: WorkbenchServices;
    hoverService: HoverService;
    viewContext: ViewContext<Interfaces>;
    onViewportRefocused?: () => void;
};

export function ViewportWrapper(props: ViewportWrapperProps): React.ReactNode {
    const { onViewportRefocused, viewId } = props;

    // View link state and handlers
    const viewLinkResult = useViewLinkResult(viewId);
    const {
        isLinked,
        isHoverHighlighted,
        highlightColor,
        viewport: linkedViewport,
        viewportSourceViewId: linkedViewportSourceViewId,
        verticalScale: linkedVerticalScale,
        focusBounds: linkedFocusBounds,
        bounds: linkedBounds,
        onLinkedViewportChange,
        onLinkedVerticalScaleChange,
        onLinkedBoundsChange,
        onToggleViewLink,
        onHoverViewLink,
    } = viewLinkResult;

    const mainDivRef = React.useRef<HTMLDivElement>(null);
    const mainDivSize = useElementSize(mainDivRef);
    const [prevFocusBounds, setPrevFocusBounds] = React.useState<Bounds | null>(null);

    const [viewport, setViewport] = React.useState<Viewport | null>(null);
    const lastPublishedViewportRef = React.useRef<Viewport | null>(null);
    const lastAppliedSyncedViewportRef = React.useRef<Viewport | null>(null);
    const hasRestoredLinkedViewportRef = React.useRef(false);
    const skipRefocusDueToRestoreRef = React.useRef(false);

    const [verticalScale, setVerticalScale] = React.useState<number>(10.0);
    const lastAppliedSyncedVerticalScaleRef = React.useRef<number | null>(null);

    const [fitInViewStatus, setFitInViewStatus] = React.useState<FitInViewStatus>(FitInViewStatus.ON);

    const [showGrid, setShowGrid] = React.useState<boolean>(true);

    const syncHelper = useRefStableSyncSettingsHelper({
        workbenchServices: props.workbenchServices,
        moduleContext: props.viewContext,
    });

    const syncedCameraPosition = syncHelper.useValue(
        SyncSettingKey.CAMERA_POSITION_INTERSECTION,
        "global.syncValue.cameraPositionIntersection",
    );
    const syncedVerticalScale = syncHelper.useValue(SyncSettingKey.VERTICAL_SCALE, "global.syncValue.verticalScale");

    // Render from local viewport only. Linked peers update this value through guarded sync.
    const effectiveVerticalScale = isLinked && linkedVerticalScale !== null ? linkedVerticalScale : verticalScale;
    const effectiveFocusBounds = isLinked && linkedFocusBounds ? linkedFocusBounds : props.focusBounds;
    const effectiveLayerItemsBounds = isLinked && linkedBounds ? linkedBounds : props.layerItemsBounds;

    // Vertical scaling factor uses both the viewport size and the effective vertical scale
    const verticalScalingFactor = React.useMemo(() => {
        let widthHeightRatio = mainDivSize.width / mainDivSize.height;
        widthHeightRatio = isValidNumber(widthHeightRatio) ? widthHeightRatio : 1.0;
        return widthHeightRatio * effectiveVerticalScale;
    }, [mainDivSize, effectiveVerticalScale]);

    // When a brand-new ViewLink is created, sharedViewport is null and neither view syncs until
    // someone interacts. Detect this case (isLinked but no sharedViewport yet) and push the local
    // viewport so both views snap to a common state immediately.
    React.useEffect(
        function syncViewportOnNewLink() {
            // Only the designated source view (the one that initiated the link) is allowed to
            // push its viewport when sharedViewport is not yet set. This prevents both views
            // from racing to push their viewports and swapping positions.
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

    React.useEffect(
        function reportBoundsToLink() {
            if (isLinked) {
                onLinkedBoundsChange(props.layerItemsBounds);
            }
        },
        [isLinked, props.layerItemsBounds, onLinkedBoundsChange],
    );

    React.useLayoutEffect(
        function syncLocalViewportFromSharedViewport() {
            if (!isLinked || !linkedViewport || !isValidViewport(linkedViewport)) {
                hasRestoredLinkedViewportRef.current = false;
                return;
            }
            // During normal operation the source view already has the viewport locally,
            // so re-applying from the link is unnecessary. But on session restore the
            // local viewport starts as null — allow the first application through.
            if (linkedViewportSourceViewId === viewId && hasRestoredLinkedViewportRef.current) {
                return;
            }
            hasRestoredLinkedViewportRef.current = true;
            skipRefocusDueToRestoreRef.current = true;
            setViewport((prev) => {
                if (!prev || !isEqual(prev, linkedViewport)) {
                    // A linked peer changed the viewport — stop fighting with refocus
                    setFitInViewStatus(FitInViewStatus.OFF);
                    return cloneDeep(linkedViewport);
                }
                return prev;
            });
        },
        [isLinked, linkedViewport, linkedViewportSourceViewId, viewId],
    );

    React.useEffect(
        function syncLocalViewportFromGlobal() {
            if (!syncedCameraPosition || !isValidViewport(syncedCameraPosition)) {
                return;
            }
            if (isEqual(syncedCameraPosition, lastAppliedSyncedViewportRef.current)) {
                return;
            }
            lastAppliedSyncedViewportRef.current = cloneDeep(syncedCameraPosition);
            setViewport((prev) => {
                if (!prev || !isEqual(prev, syncedCameraPosition)) {
                    return cloneDeep(syncedCameraPosition);
                }
                return prev;
            });
        },
        [syncedCameraPosition],
    );

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

    React.useEffect(
        function publishViewportToGlobalSync() {
            if (!viewport || !isValidViewport(viewport)) {
                return;
            }
            if (isEqual(viewport, lastPublishedViewportRef.current)) {
                return;
            }
            lastPublishedViewportRef.current = cloneDeep(viewport);
            props.workbenchServices.publishGlobalData(
                "global.syncValue.cameraPositionIntersection",
                viewport,
                props.viewContext.getInstanceIdString(),
            );
        },
        [viewport, props.workbenchServices, props.viewContext],
    );

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
                setViewport(candidateViewport);
                if (isLinked) {
                    onLinkedViewportChange(candidateViewport);
                }
                if (onViewportRefocused) {
                    onViewportRefocused();
                }
            }
        },
        [effectiveFocusBounds, verticalScalingFactor, viewport, isLinked, onLinkedViewportChange, onViewportRefocused],
    );

    React.useEffect(
        function handleRefocus() {
            if (skipRefocusDueToRestoreRef.current) {
                skipRefocusDueToRestoreRef.current = false;
                return;
            }
            if (!effectiveFocusBounds || !isValidBounds(effectiveFocusBounds)) return;
            if (fitInViewStatus === FitInViewStatus.ON || props.doRefocus) {
                refocusViewport();
            }
        },
        [mainDivSize, fitInViewStatus, effectiveFocusBounds, props.doRefocus, refocusViewport],
    );

    React.useEffect(
        function handleFocusBoundsChange() {
            if (!isEqual(effectiveFocusBounds, prevFocusBounds)) {
                setPrevFocusBounds(cloneDeep(effectiveFocusBounds));

                // Update viewport if fit in view is ON
                if (effectiveFocusBounds && fitInViewStatus === FitInViewStatus.ON) {
                    refocusViewport();
                }
            }
        },
        [effectiveFocusBounds, fitInViewStatus, prevFocusBounds, refocusViewport],
    );

    const handleViewportChange = React.useCallback(
        function handleViewportChange(newViewport: Viewport) {
            if (!isValidViewport(newViewport)) {
                throw new Error("Got invalid viewport: " + newViewport);
            }

            setViewport((prev) => {
                if (!isEqual(newViewport, prev)) {
                    setFitInViewStatus(FitInViewStatus.OFF);
                    return newViewport;
                }
                return prev;
            });
            if (isLinked) {
                onLinkedViewportChange(newViewport);
            }
        },
        [isLinked, onLinkedViewportChange],
    );

    const handleFitInViewToggle = React.useCallback(
        function handleFitInViewToggle(mode: FitInViewStatus): void {
            setFitInViewStatus(mode);

            if (mode === FitInViewStatus.ON && effectiveFocusBounds) {
                let [xMin, xMax] = effectiveFocusBounds.x;
                let [yMin, yMax] = effectiveFocusBounds.y;

                // Ensure that the bounds are finite numbers
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
                setViewport(newViewport);
                if (isLinked) {
                    onLinkedViewportChange(newViewport);
                }
            }
        },
        [effectiveFocusBounds, isLinked, verticalScalingFactor, onLinkedViewportChange],
    );

    const handleShowGridToggle = React.useCallback(function handleGridLinesToggle(active: boolean): void {
        setShowGrid(active);
    }, []);

    const handleVerticalScaleIncrease = React.useCallback(
        function handleVerticalScaleIncrease(): void {
            setVerticalScale((prev) => {
                const newVerticalScale = Math.floor(prev + 1.0);
                if (isLinked) {
                    onLinkedVerticalScaleChange(newVerticalScale);
                }
                props.workbenchServices.publishGlobalData(
                    "global.syncValue.verticalScale",
                    newVerticalScale,
                    props.viewContext.getInstanceIdString(),
                );
                return newVerticalScale;
            });
        },
        [isLinked, onLinkedVerticalScaleChange, props.viewContext, props.workbenchServices],
    );

    const handleVerticalScaleDecrease = React.useCallback(
        function handleVerticalScaleDecrease(): void {
            setVerticalScale((prev) => {
                const newVerticalScale = Math.max(1.0, Math.ceil(prev - 1.0));
                if (isLinked) {
                    onLinkedVerticalScaleChange(newVerticalScale);
                }
                props.workbenchServices.publishGlobalData(
                    "global.syncValue.verticalScale",
                    newVerticalScale,
                    props.viewContext.getInstanceIdString(),
                );
                return newVerticalScale;
            });
        },
        [isLinked, onLinkedVerticalScaleChange, props.viewContext, props.workbenchServices],
    );

    return (
        <div
            ref={mainDivRef}
            className={resolveClassNames("relative w-full h-full flex flex-col", {
                "outline-2 -outline-offset-2 rounded": isHoverHighlighted,
                "outline-gray-400": isHoverHighlighted && !highlightColor,
            })}
            style={isHoverHighlighted && highlightColor ? { outlineColor: highlightColor } : undefined}
        >
            <div style={{ height: mainDivSize.height, width: mainDivSize.width }}>
                <div className="absolute top-0 left-0 right-0 z-10 flex justify-center pointer-events-none pt-1">
                    <ViewportLabel name={props.name} color={props.color} />
                </div>
                <ReadoutWrapper
                    intersectionSource={props.intersectionSource}
                    showGrid={showGrid}
                    verticalScale={effectiveVerticalScale}
                    referenceSystem={props.referenceSystem ?? undefined}
                    layers={props.layerItems}
                    layerIdToNameMap={props.layerItemIdToNameMap}
                    bounds={effectiveLayerItemsBounds}
                    viewport={viewport ?? undefined}
                    onViewportChange={handleViewportChange}
                    hoverService={props.hoverService}
                    viewContext={props.viewContext}
                />
                <Toolbar
                    visible
                    zFactor={effectiveVerticalScale}
                    gridVisible={showGrid}
                    fitInViewStatus={fitInViewStatus}
                    onFitInViewStatusToggle={handleFitInViewToggle}
                    onGridLinesToggle={handleShowGridToggle}
                    onVerticalScaleIncrease={handleVerticalScaleIncrease}
                    onVerticalScaleDecrease={handleVerticalScaleDecrease}
                    viewLinks={viewLinkResult.availableViewLinks.map((link) => {
                        const views = link.viewIds
                            .map((id) => viewLinkResult.intersectionViews.find((v) => v.id === id))
                            .filter((v): v is NonNullable<typeof v> => v != null)
                            .map((v) => ({ id: v.id, name: v.name, color: v.color }));
                        return {
                            id: link.id,
                            color: link.color,
                            views,
                            containsThisView: link.viewIds.includes(viewId),
                        };
                    })}
                    unlinkedViews={viewLinkResult.unlinkedViews}
                    onToggleViewLink={(otherViewId) => onToggleViewLink(otherViewId, viewport)}
                    onHoverViewLink={onHoverViewLink}
                />
                <ColorLegendsContainer colorScales={props.colorScales} height={mainDivSize.height / 2 - 50} />
            </div>
        </div>
    );
}
