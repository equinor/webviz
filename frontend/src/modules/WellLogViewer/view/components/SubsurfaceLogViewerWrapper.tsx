import React from "react";

import type { WellboreHeader_api, WellboreLogCurveData_api, WellborePick_api, WellboreTrajectory_api } from "@api";
import type { colorTablesObj } from "@emerson-eps/color-tables";
import type { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { HoverTopic, useHover } from "@framework/HoverService";
import type { ModuleViewProps } from "@framework/Module";
import { SyncSettingKey } from "@framework/SyncSettings";
import type { WorkbenchServices } from "@framework/WorkbenchServices";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { createContinuousColorScaleForMap } from "@modules/3DViewer/view/utils/colorTables";
import type { TemplateTrackConfig } from "@modules/WellLogViewer/types";
import { WellLogViewer } from "@webviz/well-log-viewer";
import type { Info } from "@webviz/well-log-viewer/dist/components/InfoTypes";
import type { WellLogController } from "@webviz/well-log-viewer/dist/components/WellLogView";

import { useAtomValue } from "jotai";
import _ from "lodash";

import { ReadoutWrapper } from "./ReadoutWrapper";

import type { InterfaceTypes } from "../../interfaces";
import { createLogTemplate } from "../../utils/logViewerTemplate";
import { createLogViewerWellPicks, createWellLogSets } from "../../utils/queryDataTransform";
import { nonUniqueCurveNamesAtom } from "../atoms/derivedAtoms";

const AXIS_MNEMOS = {
    md: ["RKB", "DEPTH", "DEPT", "MD", "TDEP", "MD_RKB"],
    tvd: ["MSL", "TVD", "TVDSS", "DVER", "TVD_MSL"],
    time: ["TIME"],
};

const AXIS_TITLES = {
    md: "MD",
    tvd: "TVD",
    time: "TIME",
};

export type SubsurfaceLogViewerWrapperProps = {
    // Data
    wellboreHeader: WellboreHeader_api | null;
    curveData: WellboreLogCurveData_api[];
    trajectoryData: WellboreTrajectory_api;
    intersectionReferenceSystem: IntersectionReferenceSystem;
    wellpicks: WellborePick_api[];

    // Viewer config
    horizontal: boolean;
    padDataWithEmptyRows: boolean;
    templateTrackConfigs: TemplateTrackConfig[];

    // Passing the module props to make context and service access less cumbersome
    moduleProps: ModuleViewProps<InterfaceTypes>;
};

function useSubscribeToGlobalVerticalScaleChange(
    workbenchServices: WorkbenchServices,
    wellLogController: WellLogController | null,
    syncableSettingKeys: SyncSettingKey[],
    instanceId: string,
) {
    const verticalSyncActive = syncableSettingKeys.includes(SyncSettingKey.VERTICAL_SCALE);

    // Cannot use the SyncHelper utility here, since we want to avoid a re-render and instead propagate the change via the well log controller
    React.useEffect(() => {
        function handleGlobalVertScaleChange(newScale: number | null) {
            if (newScale === null || newScale < 1) return;
            if (!wellLogController) return console.warn("No well log controller set");

            wellLogController.zoomContent(newScale);
        }

        if (verticalSyncActive) {
            const unsubscribe = workbenchServices.subscribe(
                "global.syncValue.verticalScale",
                handleGlobalVertScaleChange,
                instanceId,
            );

            return unsubscribe;
        }
    }, [workbenchServices, wellLogController, verticalSyncActive, syncableSettingKeys, instanceId]);
}

function useCreateGlobalVerticalScaleBroadcastFunc(
    workbenchServices: WorkbenchServices,
    syncableSettingKeys: SyncSettingKey[],
    instanceId: string,
) {
    // TODO: This value DOES NOT update properly when you ENABLE the setting. So something else needs to trigger a re-render
    const verticalSyncActive = syncableSettingKeys.includes(SyncSettingKey.VERTICAL_SCALE);

    const broadcastVerticalScaleChange = React.useCallback(
        (newScale: number | null) => {
            if (!verticalSyncActive || newScale === null) return;

            workbenchServices.publishGlobalData("global.syncValue.verticalScale", newScale, instanceId);
        },
        [workbenchServices, instanceId, verticalSyncActive],
    );

    return broadcastVerticalScaleChange;
}

export function useViewerDataTransform(props: SubsurfaceLogViewerWrapperProps) {
    const nonUniqueCurveNames = useAtomValue(nonUniqueCurveNamesAtom);

    const trackConfigs = props.templateTrackConfigs;
    const trajectoryData = props.trajectoryData;
    const curveData = props.curveData;
    const intersectionReferenceSystem = props.intersectionReferenceSystem;
    const padDataWithEmptyRows = props.padDataWithEmptyRows;

    const wellpicks = React.useMemo(() => createLogViewerWellPicks(props.wellpicks), [props.wellpicks]);

    // Curve data transform is a bit heavy, so we use Memo-hooks to reduce re-render overhead
    const template = React.useMemo(
        () => createLogTemplate(trackConfigs, nonUniqueCurveNames),
        [trackConfigs, nonUniqueCurveNames],
    );

    const welllog = React.useMemo(() => {
        return createWellLogSets(
            curveData,
            trajectoryData,
            intersectionReferenceSystem,
            nonUniqueCurveNames,
            padDataWithEmptyRows,
        );
    }, [curveData, trajectoryData, intersectionReferenceSystem, padDataWithEmptyRows, nonUniqueCurveNames]);

    return { template, welllog, wellpicks };
}

function useWorkbenchColorTables(workbenchSettings: WorkbenchSettings): colorTablesObj[] {
    const workbenchColorScale = workbenchSettings.useContinuousColorScale({
        gradientType: ColorScaleGradientType.Sequential,
    });

    return React.useMemo(() => createContinuousColorScaleForMap(workbenchColorScale), [workbenchColorScale]);
}

export function SubsurfaceLogViewerWrapper(props: SubsurfaceLogViewerWrapperProps) {
    const colorTables = useWorkbenchColorTables(props.moduleProps.workbenchSettings);
    const moduleInstanceId = props.moduleProps.viewContext.getInstanceIdString();
    const syncableSettingKeys = props.moduleProps.viewContext.useSyncedSettingKeys();

    const wellboreUuid = props.wellboreHeader?.wellboreUuid ?? null;
    const hoverService = props.moduleProps.hoverService;

    // Main log viewer data
    const { template, welllog, wellpicks } = useViewerDataTransform(props);

    // WellLogViewer uses an internal controller to change things like zoom, selection and so on. Use this when possible to avoid uneccessary re-renders
    // ? Would a ref be more correct?
    const [wellLogController, setWellLogController] = React.useState<WellLogController | null>(null);
    const [wellLogReadout, setWellLogReadout] = React.useState<Info[]>([]);

    const [hoveredMd, setHoveredMd] = useHover(HoverTopic.MD, hoverService, moduleInstanceId);
    const [hoveredWellbore, setHoveredWellbore] = useHover(HoverTopic.WELLBORE, hoverService, moduleInstanceId);

    const isHoveringThisWellbore = hoveredWellbore === wellboreUuid && hoveredMd != null;

    const wellLogSelection = React.useMemo<[number | undefined, undefined]>(() => {
        if (!isHoveringThisWellbore) return [undefined, undefined];
        return [hoveredMd ?? undefined, undefined];
    }, [hoveredMd, isHoveringThisWellbore]);

    const broadcastMdHover = React.useCallback(
        function broadcastWellboreAndMdHover(md: number | null) {
            // An md of null implies we've stopped hovering this wellbore
            const wellbore = md == null ? null : wellboreUuid;

            setHoveredWellbore(wellbore);
            setHoveredMd(md);
        },
        [setHoveredMd, setHoveredWellbore, wellboreUuid],
    );

    // Set up global vertical scale synchronization
    useSubscribeToGlobalVerticalScaleChange(
        props.moduleProps.workbenchServices,
        wellLogController,
        syncableSettingKeys,
        moduleInstanceId,
    );

    const broadcastVerticalScaleChange = useCreateGlobalVerticalScaleBroadcastFunc(
        props.moduleProps.workbenchServices,
        syncableSettingKeys,
        moduleInstanceId,
    );

    // Log viewer doesn't deselect when mouse moves out of the hover-able area, so we manually do it on mouse-leave
    const handleMouseOut = React.useCallback(() => broadcastMdHover(null), [broadcastMdHover]);

    // Well log viewer event listener
    const handleCreateController = React.useCallback(function handleCreateController(controller: WellLogController) {
        // ? Something weird happens during HMR, where the controller ref becomes null, but this event still fires?
        console.debug("Setting well log viewer controller...", controller);
        setWellLogController(controller);
    }, []);

    const handleContentRescale = React.useCallback(
        function handleContentRescale() {
            const currentScale = wellLogController?.getContentZoom();

            if (currentScale) broadcastVerticalScaleChange(currentScale);
        },
        [broadcastVerticalScaleChange, wellLogController],
    );

    // Whenever the user hovers and moves the red "rubber band"
    const handleSelection = React.useCallback(
        function handleSelection() {
            let currentSelection = wellLogController?.getContentSelection()[0] ?? null;
            // Value given is occasionally NaN (i.e. when hovering an empty log)
            if (_.isNaN(currentSelection)) currentSelection = null;

            broadcastMdHover(currentSelection);

            // TODO: It's possible to pin and select a range, should we have that color a section of other synced intersections?
        },
        [broadcastMdHover, wellLogController],
    );

    // We use the computed readout from the log viewer to deal with interpolated data
    const handleInfoFilled = React.useCallback(function handleInfoFilled(infos: Info[]) {
        setWellLogReadout(infos);
    }, []);

    // ! No-op method. Passed to the viewer to make it not show the context menu for tracks
    const handleTrackMouseEvent = React.useCallback((/* welllogView: WellLogView, e: TrackMouseEvent */) => {}, []);

    return (
        // The weird tailwind-class hides the built-in hover tooltip
        <div className="h-full [&_.welllogview_.overlay_.depth]:invisible!" onMouseLeave={handleMouseOut}>
            <WellLogViewer
                id="well-log-viewer"
                wellLogSets={welllog}
                template={template}
                wellpick={wellpicks}
                selection={wellLogSelection}
                horizontal={props.horizontal}
                // Removes the default right-side readout panel
                layout={{ right: undefined }}
                axisMnemos={AXIS_MNEMOS}
                axisTitles={AXIS_TITLES}
                colorMapFunctions={colorTables}
                // Disable the pin and selection logic, since we dont use that for anything yet
                options={{ hideSelectionInterval: true, maxVisibleTrackNum: 12 }}
                onTrackMouseEvent={handleTrackMouseEvent}
                onCreateController={handleCreateController}
                onContentSelection={handleSelection}
                onContentRescale={handleContentRescale}
                onInfoFilled={handleInfoFilled}
            />

            <ReadoutWrapper
                templateTracks={props.templateTrackConfigs}
                wellLogReadout={wellLogReadout}
                hide={!isHoveringThisWellbore}
            />
        </div>
    );
}
