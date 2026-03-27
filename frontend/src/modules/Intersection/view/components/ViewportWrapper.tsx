import React from "react";

import type { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { cloneDeep, isEqual } from "lodash";

import type { HoverService } from "@framework/HoverService";
import type { ViewContext } from "@framework/ModuleContext";
import { SyncSettingKey, useRefStableSyncSettingsHelper } from "@framework/SyncSettings";
import type { Viewport } from "@framework/types/viewport";
import type { WorkbenchServices } from "@framework/WorkbenchServices";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ColorLegendsContainer } from "@modules/_shared/components/ColorLegendsContainer";
import type { ColorScaleWithId } from "@modules/_shared/components/ColorLegendsContainer/colorScaleWithId";
import type { Bounds, LayerItem } from "@modules/_shared/components/EsvIntersection";
import { FitInViewStatus, Toolbar, type ViewLinkOption } from "@modules/_shared/components/EsvIntersection/utilityComponents/Toolbar";
import {
    isValidBounds,
    isValidNumber,
    isValidViewport,
} from "@modules/_shared/components/EsvIntersection/utils/validationUtils";
import { ViewportLabel } from "@modules/_shared/components/ViewportLabel";
import type { IntersectionSettingValue } from "@modules/_shared/DataProviderFramework/settings/implementations/IntersectionSetting";
import type { Interfaces } from "@modules/Intersection/interfaces";

import { ReadoutWrapper } from "./ReadoutWrapper";

const DISPLACEMENT_FACTOR = 1.4; // Factor to increase the viewport displacement when fitting in view

export type ViewLinkProps = {
    viewLinks: ViewLinkOption[];
    unlinkedViews: { id: string; name: string; color: string | null }[];
    isLinked: boolean;
    sharedViewport: Viewport | null;
    sharedVerticalScale: number | null;
    sharedFocusBounds: Bounds | null;
    onToggleViewLink: (otherViewId: string, initiatorViewport?: Viewport | null) => void;
    onLinkedViewportChange: (viewport: Viewport) => void;
    onLinkedVerticalScaleChange: (scale: number) => void;
};

export type ViewportWrapperProps = {
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
    viewLinkProps: ViewLinkProps;
};

export function ViewportWrapper(props: ViewportWrapperProps): React.ReactNode {
    const { onViewportRefocused, viewLinkProps } = props;
    const { isLinked, sharedViewport, sharedVerticalScale, sharedFocusBounds } = viewLinkProps;

    const mainDivRef = React.useRef<HTMLDivElement>(null);
    const mainDivSize = useElementSize(mainDivRef);
    const [prevFocusBounds, setPrevFocusBounds] = React.useState<Bounds | null>(null);

    const [viewport, setViewport] = React.useState<Viewport | null>(null);
    const [prevViewport, setPrevViewport] = React.useState<Viewport | null>(null);
    const [prevSyncedViewport, setPrevSyncedViewport] = React.useState<Viewport | null>(null);

    const [verticalScale, setVerticalScale] = React.useState<number>(10.0);
    const [prevSyncedVerticalScale, setPrevSyncedVerticalScale] = React.useState<number | null>(null);

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

    // When linked, prefer shared values; fall back to local state
    const effectiveViewport = isLinked && sharedViewport ? sharedViewport : viewport;
    const effectiveVerticalScale = isLinked && sharedVerticalScale !== null ? sharedVerticalScale : verticalScale;
    const effectiveFocusBounds = isLinked && sharedFocusBounds ? sharedFocusBounds : props.focusBounds;

    // Vertical scaling factor uses both the viewport size and the effective vertical scale
    const verticalScalingFactor = React.useMemo(() => {
        let widthHeightRatio = mainDivSize.width / mainDivSize.height;
        widthHeightRatio = isValidNumber(widthHeightRatio) ? widthHeightRatio : 1.0;
        return widthHeightRatio * effectiveVerticalScale;
    }, [mainDivSize, effectiveVerticalScale]);

    // Refs for values used inside refocusViewport that should NOT trigger re-creation of the callback.
    // refocusViewport is a dep of handleRefocus/handleFocusBoundsChange effects, so any dep that changes
    // on every render (viewLinkProps is a new object each render, onViewportRefocused is an inline function)
    // would cause those effects to re-run on every render — overriding pans from linked peers.
    const effectiveViewportRef = React.useRef<Viewport | null>(effectiveViewport);
    effectiveViewportRef.current = effectiveViewport;
    const isLinkedRef = React.useRef<boolean>(isLinked);
    isLinkedRef.current = isLinked;
    const onLinkedViewportChangeRef = React.useRef(viewLinkProps.onLinkedViewportChange);
    onLinkedViewportChangeRef.current = viewLinkProps.onLinkedViewportChange;
    const onViewportRefocusedRef = React.useRef(onViewportRefocused);
    onViewportRefocusedRef.current = onViewportRefocused;
    const localViewportRef = React.useRef(viewport);
    localViewportRef.current = viewport;

    // When a brand-new ViewLink is created, sharedViewport is null and neither view syncs until
    // someone interacts. Detect this case (isLinked but no sharedViewport yet) and push the local
    // viewport so both views snap to a common state immediately.
    React.useEffect(
        function syncViewportOnNewLink() {
            if (isLinked && !sharedViewport && localViewportRef.current && isValidViewport(localViewportRef.current)) {
                onLinkedViewportChangeRef.current(localViewportRef.current);
            }
        },
        [isLinked, sharedViewport],
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

            if (isValidViewport(candidateViewport) && !isEqual(candidateViewport, effectiveViewportRef.current)) {
                setViewport(candidateViewport);
                if (isLinkedRef.current) {
                    onLinkedViewportChangeRef.current(candidateViewport);
                }
                if (onViewportRefocusedRef.current) {
                    onViewportRefocusedRef.current();
                }
            }
        },
        [effectiveFocusBounds, verticalScalingFactor],
    );

    React.useEffect(
        function handleRefocus() {
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

    if (viewport && isValidViewport(viewport) && !isEqual(viewport, prevViewport)) {
        setPrevViewport(cloneDeep(viewport));
        setPrevSyncedViewport(cloneDeep(viewport));
        props.workbenchServices.publishGlobalData(
            "global.syncValue.cameraPositionIntersection",
            viewport,
            props.viewContext.getInstanceIdString(),
        );
    }

    if (!isEqual(syncedCameraPosition, prevSyncedViewport)) {
        setPrevSyncedViewport(cloneDeep(syncedCameraPosition));
        if (syncedCameraPosition) {
            setViewport(cloneDeep(syncedCameraPosition));
        }
    }

    if (syncedVerticalScale !== prevSyncedVerticalScale) {
        setPrevSyncedVerticalScale(syncedVerticalScale);
        if (syncedVerticalScale !== null) {
            setVerticalScale(syncedVerticalScale);
        }
    }

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
                viewLinkProps.onLinkedViewportChange(newViewport);
            }
            props.workbenchServices.publishGlobalData(
                "global.syncValue.cameraPositionIntersection",
                newViewport,
                props.viewContext.getInstanceIdString(),
            );
        },
        [isLinked, viewLinkProps, props.workbenchServices, props.viewContext],
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
                    viewLinkProps.onLinkedViewportChange(newViewport);
                }
            }
        },
        [effectiveFocusBounds, isLinked, verticalScalingFactor, viewLinkProps],
    );

    const handleShowGridToggle = React.useCallback(function handleGridLinesToggle(active: boolean): void {
        setShowGrid(active);
    }, []);

    const handleVerticalScaleIncrease = React.useCallback(
        function handleVerticalScaleIncrease(): void {
            setVerticalScale((prev) => {
                const newVerticalScale = Math.floor(prev + 1.0);
                if (isLinked) {
                    viewLinkProps.onLinkedVerticalScaleChange(newVerticalScale);
                }
                props.workbenchServices.publishGlobalData(
                    "global.syncValue.verticalScale",
                    newVerticalScale,
                    props.viewContext.getInstanceIdString(),
                );
                return newVerticalScale;
            });
        },
        [isLinked, viewLinkProps, props.viewContext, props.workbenchServices],
    );

    const handleVerticalScaleDecrease = React.useCallback(
        function handleVerticalScaleDecrease(): void {
            setVerticalScale((prev) => {
                const newVerticalScale = Math.max(1.0, Math.ceil(prev - 1.0));
                if (isLinked) {
                    viewLinkProps.onLinkedVerticalScaleChange(newVerticalScale);
                }
                props.workbenchServices.publishGlobalData(
                    "global.syncValue.verticalScale",
                    newVerticalScale,
                    props.viewContext.getInstanceIdString(),
                );
                return newVerticalScale;
            });
        },
        [isLinked, viewLinkProps, props.viewContext, props.workbenchServices],
    );

    return (
        <div ref={mainDivRef} className="relative w-full h-full flex flex-col">
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
                    bounds={props.layerItemsBounds}
                    viewport={effectiveViewport ?? undefined}
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
                    viewLinks={viewLinkProps.viewLinks}
                    unlinkedViews={viewLinkProps.unlinkedViews}
                    onToggleViewLink={(otherViewId) => viewLinkProps.onToggleViewLink(otherViewId, effectiveViewport)}
                />
                <ColorLegendsContainer colorScales={props.colorScales} height={mainDivSize.height / 2 - 50} />
            </div>
        </div>
    );
}
