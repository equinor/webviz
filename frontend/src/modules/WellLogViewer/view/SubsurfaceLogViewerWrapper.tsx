import React, { useMemo, useRef } from "react";

import { WellboreHeader_api, WellboreTrajectory_api } from "@api";
import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { ModuleViewProps } from "@framework/Module";
import { GlobalTopicDefinitions } from "@framework/WorkbenchServices";
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
    onValueChange: (newValue: number) => void,
    compProps: Pick<SubsurfaceLogViewerWrapperProps, "wellboreHeader" | "moduleProps">
): (newValue: number | null) => void {
    const workbenchServices = compProps.moduleProps.workbenchServices;
    const instanceId = compProps.moduleProps.viewContext.getInstanceIdString();
    const wellboreUuid = compProps.wellboreHeader?.wellboreUuid ?? "";
    const lastRecievedChange = useRef<GlobalHoverMd>(null);

    React.useEffect(() => {
        function onGlobalValueChanged(newValue: GlobalHoverMd) {
            if (!isEqual(lastRecievedChange, newValue)) {
                lastRecievedChange.current = newValue;

                if (newValue?.wellboreUuid === wellboreUuid) {
                    onValueChange(newValue.md);
                }
            }
        }

        workbenchServices.subscribe("global.hoverMd", onGlobalValueChanged, instanceId);
    }, [workbenchServices, instanceId, wellboreUuid, onValueChange]);

    function broadcastGlobalMdChange(newMd: number | null) {
        const payload: GlobalHoverMd = newMd ? { wellboreUuid, md: newMd } : null;

        workbenchServices.publishGlobalData("global.hoverMd", payload, instanceId);
    }

    return broadcastGlobalMdChange;
}

export function SubsurfaceLogViewerWrapper(props: SubsurfaceLogViewerWrapperProps) {
    const wellLogController = useRef<WellLogController | null>(null);

    const trajectoryData = props.trajectoryData;
    const curveData = props.curveData;
    const intersectionReferenceSystem = props.intersectionReferenceSystem;

    // Curve data transform is a bit heavy, so we use Memo-hooks to reduce re-render overhead
    const template = useMemo(() => createLogTemplate(props.templateTrackConfigs), [props.templateTrackConfigs]);
    const welllog = useMemo(
        () => createWellLog(curveData, trajectoryData, intersectionReferenceSystem),
        [curveData, trajectoryData, intersectionReferenceSystem]
    );

    // Global md-hover sync
    const broadcastGlobalMdChange = useGloballySyncedMd(handleGlobalMdChange, props);
    function handleGlobalMdChange(newMd: number) {
        wellLogController.current?.selectContent([newMd, undefined]);
    }

    // Log viewer callback methods
    function handleCreateController(controller: WellLogController) {
        wellLogController.current = controller;
    }

    function handleTrackMouseEvent(/* welllogView: WellLogView, e: TrackMouseEvent */) {
        // No-op method. This method is just here to stop the builtin meny from showing
    }

    function handleSelection() {
        broadcastGlobalMdChange(wellLogController.current?.getContentSelection()[0] ?? null);
    }

    // This callback doesnt work, callback is never fired
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
                axisMnemos={AXIS_MNEMOS}
                colorTables={COLOR_TABLES}
                axisTitles={{
                    md: "DEPTH",
                    tvd: "TVD",
                    time: "TIME",
                }}
                horizontal={props.horizontal}
                layout={{ right: undefined }}
                options={{}}
                onTrackMouseEvent={handleTrackMouseEvent}
                onCreateController={handleCreateController}
                onContentSelection={handleSelection}
            />
        </div>
    );
    // TODO: Disable right panel, and make it a floating box on hover, to match intersection
    // layout={{ right: undefined }}
}
