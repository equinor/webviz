import React from "react";

import type { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { cloneDeep, isEqual } from "lodash";

import type { ViewContext } from "@framework/ModuleContext";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import type { Viewport } from "@framework/types/viewport";
import type { WorkbenchServices } from "@framework/WorkbenchServices";
import type { LayerItem } from "@modules/_shared/components/EsvIntersection";
import { Toolbar } from "@modules/_shared/components/EsvIntersection/utilityComponents/Toolbar";
import type { Interfaces } from "@modules/IntersectionNew/interfaces";

import { ReadoutWrapper } from "./readoutWrapper";

export type ViewportWrapperProps = {
    wellboreHeaderUuid: string | null;
    referenceSystem?: IntersectionReferenceSystem;
    layerItems: LayerItem[];
    layerItemIdToNameMap: Record<string, string>;
    bounds: {
        x: [number, number];
        y: [number, number];
    };
    viewport: Viewport | null;
    workbenchServices: WorkbenchServices;
    viewContext: ViewContext<Interfaces>;
};

export function ViewportWrapper(props: ViewportWrapperProps): React.ReactNode {
    const [viewport, setViewport] = React.useState<Viewport | null>(null);
    const [prevViewport, setPrevViewport] = React.useState<Viewport | null>(null);
    const [prevSyncedViewport, setPrevSyncedViewport] = React.useState<Viewport | null>(null);

    const [verticalScale, setVerticalScale] = React.useState<number>(1);
    const [prevSyncedVerticalScale, setPrevSyncedVerticalScale] = React.useState<number | null>(null);

    const [showGrid, setShowGrid] = React.useState<boolean>(true);

    const syncedSettingKeys = props.viewContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, props.workbenchServices, props.viewContext);

    const syncedCameraPosition = syncHelper.useValue(
        SyncSettingKey.CAMERA_POSITION_INTERSECTION,
        "global.syncValue.cameraPositionIntersection",
    );

    if (!isEqual(syncedCameraPosition, prevSyncedViewport)) {
        setPrevSyncedViewport(cloneDeep(syncedCameraPosition));
        if (syncedCameraPosition) {
            setViewport(cloneDeep(syncedCameraPosition));
        }
    }

    if (!isEqual(props.viewport, prevViewport)) {
        setPrevViewport(cloneDeep(viewport));
        if (props.viewport) {
            // Override viewport if prop changes
            setViewport(cloneDeep(props.viewport));
            props.workbenchServices.publishGlobalData(
                "global.syncValue.cameraPositionIntersection",
                props.viewport,
                props.viewContext.getInstanceIdString(),
            );
        }
    }

    const syncedVerticalScale = syncHelper.useValue(SyncSettingKey.VERTICAL_SCALE, "global.syncValue.verticalScale");

    if (syncedVerticalScale !== prevSyncedVerticalScale) {
        setPrevSyncedVerticalScale(syncedVerticalScale);
        if (syncedVerticalScale !== null) {
            setVerticalScale(syncedVerticalScale);
        }
    }

    const handleViewportChange = React.useCallback(
        function handleViewportChange(newViewport: Viewport) {
            if (Number.isNaN(newViewport[0]) || Number.isNaN(newViewport[1]) || Number.isNaN(newViewport[2])) {
                throw new Error("Invalid viewport: " + newViewport);
            }

            setViewport((prev) => {
                if (!isEqual(newViewport, prev)) {
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

    const handleFitInViewClick = React.useCallback(
        function handleFitInViewClick(): void {
            if (props.bounds) {
                const [xMin, xMax] = props.bounds.x;
                const [yMin, yMax] = props.bounds.y;

                const centerX = xMin + (xMax - xMin) / 2;
                const centerY = yMin + (yMax - yMin) / 2;
                const newViewport: [number, number, number] = [
                    centerX,
                    centerY,
                    Math.max(xMax - xMin, yMax - yMin) * 1.2,
                ];
                setViewport(newViewport);
            }
        },
        [props.bounds],
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
        <>
            <ReadoutWrapper
                wellboreHeaderUuid={props.wellboreHeaderUuid}
                showGrid={showGrid}
                verticalScale={verticalScale}
                referenceSystem={props.referenceSystem ?? undefined}
                layers={props.layerItems}
                layerIdToNameMap={props.layerItemIdToNameMap}
                bounds={props.bounds}
                viewport={viewport ?? undefined}
                onViewportChange={handleViewportChange}
                workbenchServices={props.workbenchServices}
                viewContext={props.viewContext}
            />
            <Toolbar
                visible
                zFactor={verticalScale}
                gridVisible={showGrid}
                onFitInView={handleFitInViewClick}
                onGridLinesToggle={handleShowGridToggle}
                onVerticalScaleIncrease={handleVerticalScaleIncrease}
                onVerticalScaleDecrease={handleVerticalScaleDecrease}
            />
        </>
    );
}
