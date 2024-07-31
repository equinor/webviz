import React from "react";

import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { ViewContext } from "@framework/ModuleContext";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { WorkbenchServices } from "@framework/WorkbenchServices";
import { LayerItem, Viewport } from "@framework/components/EsvIntersection";
import { Toolbar } from "@framework/components/EsvIntersection/utilityComponents/Toolbar";
import { Interfaces } from "@modules/Intersection/interfaces";

import { cloneDeep, isEqual } from "lodash";

import { ReadoutWrapper } from "./readoutWrapper";

export type ViewportWrapperProps = {
    wellboreHeaderUuid: string | null;
    referenceSystem?: IntersectionReferenceSystem;
    layers: LayerItem[];
    layerIdToNameMap: Record<string, string>;
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
        "global.syncValue.cameraPositionIntersection"
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
            setViewport(cloneDeep(props.viewport));
            props.workbenchServices.publishGlobalData(
                "global.syncValue.cameraPositionIntersection",
                props.viewport,
                props.viewContext.getInstanceIdString()
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
            setViewport((prev) => {
                if (!isEqual(newViewport, prev)) {
                    return newViewport;
                }
                return prev;
            });
            props.workbenchServices.publishGlobalData(
                "global.syncValue.cameraPositionIntersection",
                newViewport,
                props.viewContext.getInstanceIdString()
            );
        },
        [props.workbenchServices, props.viewContext]
    );

    const handleFitInViewClick = React.useCallback(
        function handleFitInViewClick(): void {
            if (props.referenceSystem) {
                const newViewport: [number, number, number] = [0, 0, 2000];
                const firstPoint = props.referenceSystem.projectedPath[0];
                const lastPoint = props.referenceSystem.projectedPath[props.referenceSystem.projectedPath.length - 1];
                const xMax = Math.max(firstPoint[0], lastPoint[0]);
                const xMin = Math.min(firstPoint[0], lastPoint[0]);
                const yMax = Math.max(firstPoint[1], lastPoint[1]);
                const yMin = Math.min(firstPoint[1], lastPoint[1]);

                newViewport[0] = xMin + (xMax - xMin) / 2;
                newViewport[1] = yMin + (yMax - yMin) / 2;
                newViewport[2] = Math.max(xMax - xMin, yMax - yMin) * 1.2;
                setViewport(newViewport);
            }
        },
        [props.referenceSystem]
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
                    props.viewContext.getInstanceIdString()
                );
                return newVerticalScale;
            });
        },
        [props.viewContext, props.workbenchServices]
    );

    const handleVerticalScaleDecrease = React.useCallback(
        function handleVerticalScaleIncrease(): void {
            setVerticalScale((prev) => {
                const newVerticalScale = Math.max(0.1, prev - 0.1);
                setVerticalScale(newVerticalScale);
                props.workbenchServices.publishGlobalData(
                    "global.syncValue.verticalScale",
                    newVerticalScale,
                    props.viewContext.getInstanceIdString()
                );
                return newVerticalScale;
            });
        },
        [props.viewContext, props.workbenchServices]
    );

    return (
        <>
            <ReadoutWrapper
                wellboreHeaderUuid={props.wellboreHeaderUuid}
                showGrid={showGrid}
                verticalScale={verticalScale}
                referenceSystem={props.referenceSystem ?? undefined}
                layers={props.layers}
                layerIdToNameMap={props.layerIdToNameMap}
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
