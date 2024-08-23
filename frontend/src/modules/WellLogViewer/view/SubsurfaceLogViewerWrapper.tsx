import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { WellboreHeader_api, WellboreTrajectory_api } from "@api";
import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { ModuleViewProps } from "@framework/Module";
import { ViewContext } from "@framework/ModuleContext";
import { SyncSettingKey } from "@framework/SyncSettings";
import { GlobalTopicDefinitions, WorkbenchServices } from "@framework/WorkbenchServices";
import { WellLogViewer } from "@webviz/well-log-viewer";
import { WellLogController } from "@webviz/well-log-viewer/dist/components/WellLogView";

import { isEqual } from "lodash";

import { LogCurveDataWithName } from "./queries/wellLogQueries";

import { TemplateTrackConfig } from "../settings/atoms/baseAtoms";
import { SettingsToViewInterface } from "../settingsToViewInterface";
import { State } from "../state";
import { COLOR_TABLES } from "../utils/logViewerColors";
import { createLogTemplate } from "../utils/logViewerTemplate";
import { createWellLog } from "../utils/queryDataTransform";

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
    curveData: LogCurveDataWithName[];
    trajectoryData: WellboreTrajectory_api;
    intersectionReferenceSystem: IntersectionReferenceSystem;

    // Viewer config
    horizontal: boolean;
    templateTrackConfigs: TemplateTrackConfig[];

    // Passing the module props to make context and service access less cumbersome
    moduleProps: ModuleViewProps<State, SettingsToViewInterface>;
};

function useGloballySyncedMd(
    wellboreHeader: WellboreHeader_api | null,
    wellLogController: WellLogController | null,
    workbenchServices: WorkbenchServices,
    viewContext: ViewContext<State, SettingsToViewInterface, Record<string, never>, Record<string, never>>
) {
    const instanceId = viewContext.getInstanceIdString();
    const wellboreUuid = wellboreHeader?.wellboreUuid ?? "";

    const lastRecievedChange = useRef<GlobalHoverMd>(null);

    const handleGlobalValueChange = useCallback(
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

    const broadcastGlobalMdChange = useCallback(
        (newMd: number | null) => {
            const payload: GlobalHoverMd = newMd ? { wellboreUuid, md: newMd } : null;

            workbenchServices.publishGlobalData("global.hoverMd", payload, instanceId);
        },
        [instanceId, wellboreUuid, workbenchServices]
    );

    useEffect(() => {
        return workbenchServices.subscribe("global.hoverMd", handleGlobalValueChange, instanceId);
    }, [handleGlobalValueChange, instanceId, workbenchServices]);

    return broadcastGlobalMdChange;
}

function useGloballySyncedVerticalScale(
    wellLogController: WellLogController | null,
    workbenchServices: WorkbenchServices,
    viewContext: ViewContext<State, SettingsToViewInterface, Record<string, never>, Record<string, never>>
) {
    // TODO: This value DOES NOT update properly when you ENABLE the setting. So something else needs to trigger a re-render
    const syncableSettingKeys = viewContext.useSyncedSettingKeys();
    const moduleInstanceId = viewContext.getInstanceIdString();
    const verticalSyncActive = syncableSettingKeys.includes(SyncSettingKey.VERTICAL_SCALE);

    // Cannot use the SyncHelper utility here, since we want to avoid a re-render and instead propagate the change via the well log controller
    const handleGlobalVertScaleChange = useCallback(
        (newScale: number | null) => {
            if (newScale === null || newScale < 1) return;
            if (!wellLogController) return console.warn("No well log controller set");

            wellLogController.zoomContent(newScale);
        },
        [wellLogController]
    );

    useEffect(() => {
        if (verticalSyncActive) {
            const unsubscribe = workbenchServices.subscribe(
                "global.syncValue.verticalScale",
                handleGlobalVertScaleChange,
                moduleInstanceId
            );

            return unsubscribe;
        }
    }, [workbenchServices, verticalSyncActive, syncableSettingKeys, moduleInstanceId, handleGlobalVertScaleChange]);

    const broadcastVerticalScaleChange = useCallback(
        (newScale: number | null) => {
            if (!verticalSyncActive || newScale === null) return;

            workbenchServices.publishGlobalData("global.syncValue.verticalScale", newScale, moduleInstanceId);
        },
        [workbenchServices, moduleInstanceId, verticalSyncActive]
    );

    return broadcastVerticalScaleChange;
}

export function useViewerDataTransform(props: SubsurfaceLogViewerWrapperProps) {
    const trackConfigs = props.templateTrackConfigs;
    const trajectoryData = props.trajectoryData;
    const curveData = props.curveData;
    const intersectionReferenceSystem = props.intersectionReferenceSystem;

    // Curve data transform is a bit heavy, so we use Memo-hooks to reduce re-render overhead
    const template = useMemo(() => createLogTemplate(trackConfigs), [trackConfigs]);
    const welllog = useMemo(
        () => createWellLog(curveData, trajectoryData, intersectionReferenceSystem),
        [curveData, trajectoryData, intersectionReferenceSystem]
    );

    return { template, welllog };
}

export function SubsurfaceLogViewerWrapper(props: SubsurfaceLogViewerWrapperProps) {
    // <WellLogViewer /> uses an internal controller to change things like zoom, selection and so on. Use this when possible to avoid uneccessary re-renders
    const [wellLogController, setWellLogController] = useState<WellLogController | null>(null);

    const { template, welllog } = useViewerDataTransform(props);

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

    // Log viewer module callbacks
    function handleCreateController(controller: WellLogController) {
        // ? Something weird happens during HMR, where the controller ref becomes null, but this event still fires?
        console.debug("Setting well log viewer controller...", controller);
        setWellLogController(controller);
    }

    function handleContentRescale() {
        const currentScale = wellLogController?.getContentZoom();

        if (currentScale) broadcastVerticalScaleChange(currentScale);
    }

    function handleTrackMouseEvent(/* welllogView: WellLogView, e: TrackMouseEvent */) {
        // ! No-op method. Passed to the viewer to make it not show the context menu for tracks
    }

    function handleSelection() {
        const currentSelection = wellLogController?.getContentSelection()[0] ?? null;

        broadcastGlobalMdChange(currentSelection);

        // TODO: Take the current MD, and show respective data for all tracks
        // TODO: It's possible to pin and select a range, should we have that color a section of other synced intersections?
    }

    // This callback doesnt work, viewer never fires it
    // function handleViewerInfo(x: number, logController: any, iFrom: number, iTo: number) {
    //     console.log("x", x);
    //     console.log("logController", logController);
    //     console.log("iFrom", iFrom);
    //     console.log("iTo", iTo);
    // }

    return (
        <div className="h-full" onMouseLeave={() => broadcastGlobalMdChange(null)}>
            <WellLogViewer
                id="asasdads"
                welllog={welllog}
                template={template}
                horizontal={props.horizontal}
                // Removes the default right-side readout panel
                layout={{ right: undefined }}
                axisMnemos={AXIS_MNEMOS}
                axisTitles={AXIS_TITLES}
                colorTables={COLOR_TABLES}
                onTrackMouseEvent={handleTrackMouseEvent}
                onCreateController={handleCreateController}
                onContentSelection={handleSelection}
                onContentRescale={handleContentRescale}
            />
        </div>
    );
    // TODO: Disable right panel, and make it a floating box on hover, to match intersection
    // layout={{ right: undefined }}
}
