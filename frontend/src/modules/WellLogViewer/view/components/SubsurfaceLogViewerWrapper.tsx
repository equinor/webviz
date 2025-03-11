import React from "react";

import type { WellboreHeader_api, WellboreLogCurveData_api, WellborePick_api, WellboreTrajectory_api } from "@api";
import type { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { HoverTopic, useHoverValue } from "@framework/HoverService";
import type { ModuleViewProps } from "@framework/Module";
import { SyncSettingKey } from "@framework/SyncSettings";
import type { GlobalTopicDefinitions, WorkbenchServices } from "@framework/WorkbenchServices";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { createContinuousColorScaleForMap } from "@modules/3DViewer/view/utils/colorTables";
import type { TemplateTrackConfig } from "@modules/WellLogViewer/types";
import { WellLogViewer } from "@webviz/well-log-viewer";
import type { Info } from "@webviz/well-log-viewer/dist/components/InfoTypes";
import type { WellLogController } from "@webviz/well-log-viewer/dist/components/WellLogView";

import { useAtomValue } from "jotai";
import { isEqual } from "lodash";

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

// TODO: Fully remove
type GlobalHoverMd = GlobalTopicDefinitions["global.hoverMd"];

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

// TODO: Fully remove
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function useSubscribeToGlobalHoverMdChange(
    workbenchServices: WorkbenchServices,
    wellLogController: WellLogController | null,
    instanceId: string,
    wellboreUuid: string,
) {
    const lastReceivedChange = React.useRef<GlobalHoverMd>(null);

    React.useEffect(
        function registerMdHoverSubscriber() {
            function handleGlobalValueChange(newValue: GlobalHoverMd) {
                if (!isEqual(lastReceivedChange, newValue)) {
                    lastReceivedChange.current = newValue;

                    if (newValue?.wellboreUuid === wellboreUuid) {
                        wellLogController?.selectContent([newValue.md, undefined]);
                    }
                }
            }

            return workbenchServices.subscribe("global.hoverMd", handleGlobalValueChange, instanceId);
        },
        [instanceId, wellboreUuid, workbenchServices, wellLogController],
    );
}

// TODO: Fully remove
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function useCreateGlobalHoverMdBroadcastFunc(
    workbenchServices: WorkbenchServices,
    instanceId: string,
    wellboreUuid: string,
) {
    const broadcastGlobalMdChange = React.useCallback(
        (newMd: number | null) => {
            const payload: GlobalHoverMd = newMd ? { wellboreUuid, md: newMd } : null;

            workbenchServices.publishGlobalData("global.hoverMd", payload, instanceId);
        },
        [instanceId, wellboreUuid, workbenchServices],
    );

    return broadcastGlobalMdChange;
}

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

export function SubsurfaceLogViewerWrapper(props: SubsurfaceLogViewerWrapperProps) {
    // <WellLogViewer /> uses an internal controller to change things like zoom, selection and so on. Use this when possible to avoid uneccessary re-renders
    const [wellLogController, setWellLogController] = React.useState<WellLogController | null>(null);
    const [wellLogReadout, setWellLogReadout] = React.useState<Info[]>([]);
    const [showReadoutBox, setShowReadoutBox] = React.useState<boolean>(false);

    const { template, welllog, wellpicks } = useViewerDataTransform(props);

    const colorScale = props.moduleProps.workbenchSettings.useContinuousColorScale({
        gradientType: ColorScaleGradientType.Sequential,
    });
    const colorTables = React.useMemo(() => createContinuousColorScaleForMap(colorScale), [colorScale]);

    const moduleInstanceId = props.moduleProps.viewContext.getInstanceIdString();
    const syncableSettingKeys = props.moduleProps.viewContext.useSyncedSettingKeys();

    const wellboreUuid = props.wellboreHeader?.wellboreUuid;
    const hoverService = props.moduleProps.hoverService;

    // Set up global hover md synchronization
    const [hoveredMd, setHoveredMd] = useHoverValue(HoverTopic.MD, hoverService, moduleInstanceId);
    const [hoveredWellbore, setHoveredWellbore] = useHoverValue(HoverTopic.WELLBORE, hoverService, moduleInstanceId);

    const broadcastMdHover = React.useCallback(
        function broadcastWellboreAndMdHover(md: number | null) {
            setHoveredWellbore(wellboreUuid ?? null);
            setHoveredMd(md);
        },
        [setHoveredMd, setHoveredWellbore, wellboreUuid]
    );

    // If there was an external update from some other place, update selection
    if (hoveredWellbore === wellboreUuid) {
        wellLogController?.selectContent([hoveredMd ?? undefined, undefined]);
    }

    // Set up global vertical scale synchronization
    useSubscribeToGlobalVerticalScaleChange(
        props.moduleProps.workbenchServices,
        wellLogController,
        syncableSettingKeys,
        moduleInstanceId
    );
    const broadcastVerticalScaleChange = useCreateGlobalVerticalScaleBroadcastFunc(
        props.moduleProps.workbenchServices,
        syncableSettingKeys,
        moduleInstanceId
    );

    const handleMouseOut = React.useCallback(
        function handleMouseOut() {
            broadcastMdHover(null);
            setShowReadoutBox(false);
        },
        [broadcastMdHover]
    );

    const handleMouseIn = React.useCallback(function handleMouseIn() {
        setShowReadoutBox(true);
    }, []);

    // Log viewer module callbacks
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

    const handleSelection = React.useCallback(
        function handleSelection() {
            const currentSelection = wellLogController?.getContentSelection()[0] ?? null;

            broadcastMdHover(currentSelection);

            // TODO: It's possible to pin and select a range, should we have that color a section of other synced intersections?
        },
        [broadcastMdHover, wellLogController]
    );

    const handleInfoFilled = React.useCallback(function handleInfoFilled(infos: Info[]) {
        setWellLogReadout(infos);
    }, []);

    const handleTrackMouseEvent = React.useCallback(
        (/* welllogView: WellLogView, e: TrackMouseEvent */) => {
            // ! No-op method. Passed to the viewer to make it not show the context menu for tracks
        },
        [],
    );

    return (
        // The weird tailwind-class hides the built-in hover tooltip
        <div
            className="h-full [&_.welllogview_.overlay_.depth]:invisible!"
            onMouseEnter={handleMouseIn}
            onMouseLeave={handleMouseOut}
        >
            <WellLogViewer
                id="well-log-viewer"
                wellLogSets={welllog}
                template={template}
                wellpick={wellpicks}
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
                hide={!showReadoutBox}
            />
        </div>
    );
}
