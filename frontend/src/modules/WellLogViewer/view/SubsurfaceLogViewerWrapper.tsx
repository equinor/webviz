import React from "react";

import { WellboreHeader_api, WellboreLogCurveData_api, WellboreTrajectory_api } from "@api";
import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { ModuleViewProps } from "@framework/Module";
import { ViewContext } from "@framework/ModuleContext";
import { SyncSettingKey } from "@framework/SyncSettings";
import { GlobalTopicDefinitions, WorkbenchServices } from "@framework/WorkbenchServices";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { createContinuousColorScaleForMap } from "@modules/3DViewer/view/utils/colorTables";
import { WellPicksLayerData } from "@modules/Intersection/utils/layers/WellpicksLayer";
import { WellLogViewer } from "@webviz/well-log-viewer";
import { Info } from "@webviz/well-log-viewer/dist/components/InfoTypes";
import { TemplateTrack } from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";
import { WellLogController } from "@webviz/well-log-viewer/dist/components/WellLogView";

import { isEqual } from "lodash";

import { ReadoutWrapper } from "./ReadoutWrapper";

import { InterfaceTypes } from "../interfaces";
import { createLogTemplate } from "../utils/logViewerTemplate";
import { createLogViewerWellpicks, createWellLog } from "../utils/queryDataTransform";

const AXIS_MNEMOS = {
    md: ["DEPTH", "DEPT", "MD", "TDEP", "MD_RKB"],
    tvd: ["TVD", "TVDSS", "DVER", "TVD_MSL"],
    time: ["TIME"],
};

const AXIS_TITLES = {
    md: "DEPTH",
    tvd: "TVD",
    time: "TIME",
};

type GlobalHoverMd = GlobalTopicDefinitions["global.hoverMd"];

export type SubsurfaceLogViewerWrapperProps = {
    // Data
    wellboreHeader: WellboreHeader_api | null;
    curveData: WellboreLogCurveData_api[];
    trajectoryData: WellboreTrajectory_api;
    intersectionReferenceSystem: IntersectionReferenceSystem;
    wellpicks: WellPicksLayerData;

    // Viewer config
    horizontal: boolean;
    padDataWithEmptyRows: boolean;
    templateTracks: TemplateTrack[];

    // Passing the module props to make context and service access less cumbersome
    moduleProps: ModuleViewProps<InterfaceTypes>;
};

function useGloballySyncedMd(
    wellboreHeader: WellboreHeader_api | null,
    wellLogController: WellLogController | null,
    workbenchServices: WorkbenchServices,
    viewContext: ViewContext<InterfaceTypes>
) {
    const instanceId = viewContext.getInstanceIdString();
    const wellboreUuid = wellboreHeader?.wellboreUuid ?? "";

    const lastRecievedChange = React.useRef<GlobalHoverMd>(null);

    const handleGlobalValueChange = React.useCallback(
        (newValue: GlobalHoverMd) => {
            if (!isEqual(lastRecievedChange, newValue)) {
                lastRecievedChange.current = newValue;

                if (newValue?.wellboreUuid === wellboreUuid) {
                    wellLogController?.selectContent([newValue.md, undefined]);
                }
            }
        },
        [wellLogController, wellboreUuid]
    );

    const broadcastGlobalMdChange = React.useCallback(
        (newMd: number | null) => {
            const payload: GlobalHoverMd = newMd ? { wellboreUuid, md: newMd } : null;

            workbenchServices.publishGlobalData("global.hoverMd", payload, instanceId);
        },
        [instanceId, wellboreUuid, workbenchServices]
    );

    React.useEffect(() => {
        return workbenchServices.subscribe("global.hoverMd", handleGlobalValueChange, instanceId);
    }, [handleGlobalValueChange, instanceId, workbenchServices]);

    return broadcastGlobalMdChange;
}

function useGloballySyncedVerticalScale(
    wellLogController: WellLogController | null,
    workbenchServices: WorkbenchServices,
    viewContext: ViewContext<InterfaceTypes>
) {
    // TODO: This value DOES NOT update properly when you ENABLE the setting. So something else needs to trigger a re-render
    const syncableSettingKeys = viewContext.useSyncedSettingKeys();
    const moduleInstanceId = viewContext.getInstanceIdString();
    const verticalSyncActive = syncableSettingKeys.includes(SyncSettingKey.VERTICAL_SCALE);

    // Cannot use the SyncHelper utility here, since we want to avoid a re-render and instead propagate the change via the well log controller
    const handleGlobalVertScaleChange = React.useCallback(
        (newScale: number | null) => {
            if (newScale === null || newScale < 1) return;
            if (!wellLogController) return console.warn("No well log controller set");

            wellLogController.zoomContent(newScale);
        },
        [wellLogController]
    );

    React.useEffect(() => {
        if (verticalSyncActive) {
            const unsubscribe = workbenchServices.subscribe(
                "global.syncValue.verticalScale",
                handleGlobalVertScaleChange,
                moduleInstanceId
            );

            return unsubscribe;
        }
    }, [workbenchServices, verticalSyncActive, syncableSettingKeys, moduleInstanceId, handleGlobalVertScaleChange]);

    const broadcastVerticalScaleChange = React.useCallback(
        (newScale: number | null) => {
            if (!verticalSyncActive || newScale === null) return;

            workbenchServices.publishGlobalData("global.syncValue.verticalScale", newScale, moduleInstanceId);
        },
        [workbenchServices, moduleInstanceId, verticalSyncActive]
    );

    return broadcastVerticalScaleChange;
}

export function useViewerDataTransform(props: SubsurfaceLogViewerWrapperProps) {
    const trackConfigs = props.templateTracks;
    const trajectoryData = props.trajectoryData;
    const curveData = props.curveData;
    const intersectionReferenceSystem = props.intersectionReferenceSystem;
    const padDataWithEmptyRows = props.padDataWithEmptyRows;

    // Curve data transform is a bit heavy, so we use Memo-hooks to reduce re-render overhead
    const template = React.useMemo(() => createLogTemplate(trackConfigs), [trackConfigs]);
    const wellpicks = React.useMemo(() => createLogViewerWellpicks(props.wellpicks), [props.wellpicks]);
    const welllog = React.useMemo(
        () => createWellLog(curveData, trajectoryData, intersectionReferenceSystem, padDataWithEmptyRows),
        [curveData, trajectoryData, intersectionReferenceSystem, padDataWithEmptyRows]
    );

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

    // Global value syncronization
    const broadcastGlobalMdChange = useGloballySyncedMd(
        props.wellboreHeader,
        wellLogController,
        props.moduleProps.workbenchServices,
        props.moduleProps.viewContext
    );

    const broadcastVerticalScaleChange = useGloballySyncedVerticalScale(
        wellLogController,
        props.moduleProps.workbenchServices,
        props.moduleProps.viewContext
    );

    const handleMouseOut = React.useCallback(
        function handleMouseOut() {
            broadcastGlobalMdChange(null);
            setShowReadoutBox(false);
        },
        [broadcastGlobalMdChange]
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
        [broadcastVerticalScaleChange, wellLogController]
    );

    const handleSelection = React.useCallback(
        function handleSelection() {
            const currentSelection = wellLogController?.getContentSelection()[0] ?? null;

            broadcastGlobalMdChange(currentSelection);

            // TODO: It's possible to pin and select a range, should we have that color a section of other synced intersections?
        },
        [broadcastGlobalMdChange, wellLogController]
    );

    const handleInfoFilled = React.useCallback(function handleInfoFilled(infos: Info[]) {
        setWellLogReadout(infos);
    }, []);

    const handleTrackMouseEvent = React.useCallback(
        (/* welllogView: WellLogView, e: TrackMouseEvent */) => {
            // ! No-op method. Passed to the viewer to make it not show the context menu for tracks
        },
        []
    );

    return (
        // The weird tailwind-class hides the built-in hover tooltip
        <div
            className="h-full [&_.welllogview_.overlay_.depth]:!invisible"
            onMouseEnter={handleMouseIn}
            onMouseLeave={handleMouseOut}
        >
            <WellLogViewer
                id="well-log-viewer"
                welllog={welllog}
                template={template}
                wellpick={wellpicks}
                horizontal={props.horizontal}
                // Removes the default right-side readout panel
                layout={{ right: undefined }}
                axisMnemos={AXIS_MNEMOS}
                axisTitles={AXIS_TITLES}
                colorTables={colorTables}
                // Disable the pin and selection logic, since we dont use that for anything yet
                options={{ hideSelectionInterval: true }}
                onTrackMouseEvent={handleTrackMouseEvent}
                onCreateController={handleCreateController}
                onContentSelection={handleSelection}
                onContentRescale={handleContentRescale}
                onInfoFilled={handleInfoFilled}
            />
            {showReadoutBox && <ReadoutWrapper templateTracks={props.templateTracks} wellLogReadout={wellLogReadout} />}
        </div>
    );
}
