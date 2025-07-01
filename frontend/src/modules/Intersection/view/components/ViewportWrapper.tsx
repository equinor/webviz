import React from "react";

import type { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { cloneDeep, isEqual } from "lodash";

import type { HoverService } from "@framework/HoverService";
import type { ViewContext } from "@framework/ModuleContext";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import type { Viewport } from "@framework/types/viewport";
import type { WorkbenchServices } from "@framework/WorkbenchServices";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ColorLegendsContainer } from "@modules/_shared/components/ColorLegendsContainer";
import type { ColorScaleWithId } from "@modules/_shared/components/ColorLegendsContainer/colorScaleWithId";
import type { Bounds, LayerItem } from "@modules/_shared/components/EsvIntersection";
import { FitInViewStatus, Toolbar } from "@modules/_shared/components/EsvIntersection/utilityComponents/Toolbar";
import {
    isValidBounds,
    isValidNumber,
    isValidViewport,
} from "@modules/_shared/components/EsvIntersection/utils/validationUtils";
import type { Interfaces } from "@modules/Intersection/interfaces";

import { ReadoutWrapper } from "./ReadoutWrapper";

const DISPLACEMENT_FACTOR = 1.4; // Factor to increase the viewport displacement when fitting in view

export type ViewportWrapperProps = {
    wellboreHeaderUuid: string | null;
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
    const { onViewportRefocused } = props;

    const mainDivRef = React.useRef<HTMLDivElement>(null);
    const mainDivSize = useElementSize(mainDivRef);
    const [prevFocusBounds, setPrevFocusBounds] = React.useState<Bounds | null>(null);

    const [viewport, setViewport] = React.useState<Viewport | null>(null);
    const [prevViewport, setPrevViewport] = React.useState<Viewport | null>(null);
    const [prevSyncedViewport, setPrevSyncedViewport] = React.useState<Viewport | null>(null);

    const [verticalScale, setVerticalScale] = React.useState<number>(1);
    const [prevSyncedVerticalScale, setPrevSyncedVerticalScale] = React.useState<number | null>(null);

    const [fitInViewStatus, setFitInViewStatus] = React.useState<FitInViewStatus>(FitInViewStatus.ON);

    const [showGrid, setShowGrid] = React.useState<boolean>(true);

    const syncedSettingKeys = props.viewContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, props.workbenchServices, props.viewContext);

    const syncedCameraPosition = syncHelper.useValue(
        SyncSettingKey.CAMERA_POSITION_INTERSECTION,
        "global.syncValue.cameraPositionIntersection",
    );
    const syncedVerticalScale = syncHelper.useValue(SyncSettingKey.VERTICAL_SCALE, "global.syncValue.verticalScale");

    // Vertical scaling factor uses both the viewport size and the vertical scale setting
    const verticalScalingFactor = React.useMemo(() => {
        let widthHeightRatio = mainDivSize.width / mainDivSize.height;
        widthHeightRatio = isValidNumber(widthHeightRatio) ? widthHeightRatio : 1.0;
        return widthHeightRatio * verticalScale;
    }, [mainDivSize, verticalScale]);

    const refocusViewport = React.useCallback(
        function refocusViewport(): void {
            if (!props.focusBounds) {
                return;
            }
            const candidateViewport: Viewport = [
                props.focusBounds.x[0] + (props.focusBounds.x[1] - props.focusBounds.x[0]) / 2,
                props.focusBounds.y[0] + (props.focusBounds.y[1] - props.focusBounds.y[0]) / 2,
                Math.max(
                    props.focusBounds.x[1] - props.focusBounds.x[0],
                    (props.focusBounds.y[1] - props.focusBounds.y[0]) * verticalScalingFactor,
                ) * DISPLACEMENT_FACTOR,
            ];

            if (isValidViewport(candidateViewport) && !isEqual(candidateViewport, viewport)) {
                setViewport(candidateViewport);

                if (onViewportRefocused) {
                    onViewportRefocused();
                }
            }
        },
        [props.focusBounds, onViewportRefocused, verticalScalingFactor, viewport],
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

    if (props.doRefocus && props.focusBounds && isValidBounds(props.focusBounds)) {
        refocusViewport();
    }

    if (syncedVerticalScale !== prevSyncedVerticalScale) {
        setPrevSyncedVerticalScale(syncedVerticalScale);
        if (syncedVerticalScale !== null) {
            setVerticalScale(syncedVerticalScale);
        }
    }

    if (!isEqual(props.focusBounds, prevFocusBounds)) {
        setPrevFocusBounds(cloneDeep(props.focusBounds));

        // Update viewport if fit in view is ON
        if (props.focusBounds && fitInViewStatus === FitInViewStatus.ON) {
            refocusViewport();
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
            props.workbenchServices.publishGlobalData(
                "global.syncValue.cameraPositionIntersection",
                newViewport,
                props.viewContext.getInstanceIdString(),
            );
        },
        [props.workbenchServices, props.viewContext],
    );

    const handleFitInViewToggle = React.useCallback(
        function handleFitInViewToggle(mode: FitInViewStatus): void {
            setFitInViewStatus(mode);

            if (mode === FitInViewStatus.ON && props.focusBounds) {
                let [xMin, xMax] = props.focusBounds.x;
                let [yMin, yMax] = props.focusBounds.y;

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
            }
        },
        [props.focusBounds, verticalScalingFactor],
    );

    const handleShowGridToggle = React.useCallback(function handleGridLinesToggle(active: boolean): void {
        setShowGrid(active);
    }, []);

    const handleVerticalScaleIncrease = React.useCallback(
        function handleVerticalScaleIncrease(): void {
            setVerticalScale((prev) => {
                const newVerticalScale = prev + 0.1;
                setVerticalScale(newVerticalScale);
                props.workbenchServices.publishGlobalData(
                    "global.syncValue.verticalScale",
                    newVerticalScale,
                    props.viewContext.getInstanceIdString(),
                );
                return newVerticalScale;
            });
        },
        [props.viewContext, props.workbenchServices],
    );

    const handleVerticalScaleDecrease = React.useCallback(
        function handleVerticalScaleIncrease(): void {
            setVerticalScale((prev) => {
                const newVerticalScale = Math.max(0.1, prev - 0.1);
                setVerticalScale(newVerticalScale);
                props.workbenchServices.publishGlobalData(
                    "global.syncValue.verticalScale",
                    newVerticalScale,
                    props.viewContext.getInstanceIdString(),
                );
                return newVerticalScale;
            });
        },
        [props.viewContext, props.workbenchServices],
    );

    return (
        <div ref={mainDivRef} className="relative w-full h-full flex flex-col">
            <div style={{ height: mainDivSize.height, width: mainDivSize.width }}>
                <ReadoutWrapper
                    wellboreHeaderUuid={props.wellboreHeaderUuid}
                    showGrid={showGrid}
                    verticalScale={verticalScale}
                    referenceSystem={props.referenceSystem ?? undefined}
                    layers={props.layerItems}
                    layerIdToNameMap={props.layerItemIdToNameMap}
                    bounds={props.layerItemsBounds}
                    viewport={viewport ?? undefined}
                    onViewportChange={handleViewportChange}
                    hoverService={props.hoverService}
                    viewContext={props.viewContext}
                />
                <Toolbar
                    visible
                    zFactor={verticalScale}
                    gridVisible={showGrid}
                    fitInViewStatus={fitInViewStatus}
                    onFitInViewStatusToggle={handleFitInViewToggle}
                    onGridLinesToggle={handleShowGridToggle}
                    onVerticalScaleIncrease={handleVerticalScaleIncrease}
                    onVerticalScaleDecrease={handleVerticalScaleDecrease}
                />
                <ColorLegendsContainer colorScales={props.colorScales} height={mainDivSize.height / 2 - 50} />
            </div>
        </div>
    );
}
