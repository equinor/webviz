import React from "react";

import { WellLogViewer } from "@webviz/well-log-viewer";
import type { Info } from "@webviz/well-log-viewer/dist/components/InfoTypes";
import type { WellLogSet } from "@webviz/well-log-viewer/dist/components/WellLogTypes";
import type {
    WellLogController,
    WellLogViewOptions,
    WellPickProps,
} from "@webviz/well-log-viewer/dist/components/WellLogView";
import type { ColorMapFunction } from "@webviz/well-log-viewer/dist/utils/color-function";
import { isEqual } from "lodash";

import type { WellboreHeader_api } from "@api";
import type { ModuleViewProps } from "@framework/Module";
import { SyncSettingKey } from "@framework/SyncSettings";
import type { GlobalTopicDefinitions, WorkbenchServices } from "@framework/WorkbenchServices";
import type { Template } from "@modules/WellLogViewer/types";

import type { InterfaceTypes } from "../../interfaces";

import { ReadoutWrapper } from "./ReadoutWrapper";

const VIEWER_OPTIONS: WellLogViewOptions = {
    // Disable selection (pinning a range) for now. Might reintroduce later.
    hideSelectionInterval: true,
    // We think it's unlikely a user will have more than 12, and the viewers scrolling feature is somewhat cumbersome.
    // Could consider having this be computed based on track sizes, and available module space
    maxVisibleTrackNum: 12,
};

// Removes the default right-side readout panel
const VIEWER_LAYOUT = { right: undefined };

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

type GlobalHoverMd = GlobalTopicDefinitions["global.hoverMd"];

export type SubsurfaceLogViewerWrapperProps = {
    // Data
    wellboreHeader: WellboreHeader_api | null;
    wellLogSets: WellLogSet[];
    wellPicks?: WellPickProps;

    // Viewer config
    viewerTemplate: Template;
    colorMapFunctions?: ColorMapFunction[];
    horizontal: boolean;

    // Passing the module props to make context and service access less cumbersome
    moduleProps: ModuleViewProps<InterfaceTypes>;
};

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

export function SubsurfaceLogViewerWrapper(props: SubsurfaceLogViewerWrapperProps) {
    // <WellLogViewer /> uses an internal controller to change things like zoom, selection and so on. Use this when possible to avoid uneccessary re-renders
    const [wellLogController, setWellLogController] = React.useState<WellLogController | null>(null);
    const [wellLogReadout, setWellLogReadout] = React.useState<Info[]>([]);
    const [showReadoutBox, setShowReadoutBox] = React.useState<boolean>(false);

    const instanceId = props.moduleProps.viewContext.getInstanceIdString();
    const syncableSettingKeys = props.moduleProps.viewContext.useSyncedSettingKeys();
    const wellboreUuid = props.wellboreHeader?.wellboreUuid ?? "";

    // Set up global hover md synchronization
    useSubscribeToGlobalHoverMdChange(props.moduleProps.workbenchServices, wellLogController, instanceId, wellboreUuid);
    const broadcastGlobalMdChange = useCreateGlobalHoverMdBroadcastFunc(
        props.moduleProps.workbenchServices,
        instanceId,
        wellboreUuid,
    );

    // Set up global vertical scale synchronization
    useSubscribeToGlobalVerticalScaleChange(
        props.moduleProps.workbenchServices,
        wellLogController,
        syncableSettingKeys,
        instanceId,
    );
    const broadcastVerticalScaleChange = useCreateGlobalVerticalScaleBroadcastFunc(
        props.moduleProps.workbenchServices,
        syncableSettingKeys,
        instanceId,
    );

    const handleMouseOut = React.useCallback(
        function handleMouseOut() {
            broadcastGlobalMdChange(null);
            setShowReadoutBox(false);
        },
        [broadcastGlobalMdChange],
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

            broadcastGlobalMdChange(currentSelection);

            // TODO: It's possible to pin and select a range, should we have that color a section of other synced intersections?
        },
        [broadcastGlobalMdChange, wellLogController],
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
                template={props.viewerTemplate}
                wellLogSets={props.wellLogSets}
                wellpick={props.wellPicks}
                horizontal={props.horizontal}
                layout={VIEWER_LAYOUT}
                axisMnemos={AXIS_MNEMOS}
                axisTitles={AXIS_TITLES}
                colorMapFunctions={props.colorMapFunctions ?? []}
                // Disable the pin and selection logic, since we dont use that for anything yet
                options={VIEWER_OPTIONS}
                onTrackMouseEvent={handleTrackMouseEvent}
                onCreateController={handleCreateController}
                onContentSelection={handleSelection}
                onContentRescale={handleContentRescale}
                onInfoFilled={handleInfoFilled}
            />

            <ReadoutWrapper
                templateTracks={props.viewerTemplate?.tracks ?? []}
                wellLogReadout={wellLogReadout}
                hide={!showReadoutBox}
            />
        </div>
    );
}
