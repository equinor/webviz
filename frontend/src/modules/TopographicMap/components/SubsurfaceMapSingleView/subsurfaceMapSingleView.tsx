import React from "react";

import { SurfaceData_api } from "@api";
import {
    AdjustmentsHorizontalIcon,
    ChartBarIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    Cog8ToothIcon,
    TableCellsIcon,
} from "@heroicons/react/20/solid";
import { Label } from "@lib/components/Label";
import { Switch } from "@lib/components/Switch";
import SubsurfaceViewer from "@webviz/subsurface-viewer";

export type subsurfaceMapSingleViewProps = { surfData: SurfaceData_api | null };
//-----------------------------------------------------------------------------------------------------------
export function SubsurfaceMapSingleView(props: subsurfaceMapSingleViewProps): JSX.Element {
    const renderCount = React.useRef(0);
    const [settingsIsOpen, setSettingsIsOpen] = React.useState(false);
    const [showContour, setShowContour] = React.useState(false);
    const [showGrid, setShowGrid] = React.useState(false);
    const [showSmoothShading, setShowSmoothShading] = React.useState(false);
    const [showMaterial, setShowMaterial] = React.useState(false);
    React.useEffect(function incrementRenderCount() {
        renderCount.current = renderCount.current + 1;
    });

    let layers: Record<string, unknown>[] = [];
    if (props.surfData) {
        layers.push(createSurfaceMeshLayer(props.surfData, showContour, showGrid, showSmoothShading, showMaterial));
    }
    return (
        <div className="relative w-full h-full flex flex-col">
            {settingsIsOpen && (
                <div className="absolute bottom-0 right-0  z-10 bg-white  rounded-md">
                    <div className=" border-solid bg-white   h-60 w-55 border-2 border-slate-200 overflow-auto">
                        <div
                            onClick={() => setSettingsIsOpen(!settingsIsOpen)}
                            className="flex flex-row bg-slate-200 text-xs text-center"
                        >
                            <div className="mx-10">View settings</div>
                            <div className="float-right">
                                <ChevronDownIcon className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="p-2">
                            <LabelledSwitch
                                label="Contours"
                                checked={showContour}
                                onChange={(e: any) => setShowContour(e.target.checked)}
                            />
                            <LabelledSwitch
                                label="Grid lines"
                                checked={showGrid}
                                onChange={(e: any) => setShowGrid(e.target.checked)}
                            />
                            <LabelledSwitch
                                label="Smooth shading"
                                checked={showSmoothShading}
                                onChange={(e: any) => setShowSmoothShading(e.target.checked)}
                            />
                            <LabelledSwitch
                                label="Material"
                                checked={showMaterial}
                                onChange={(e: any) => setShowMaterial(e.target.checked)}
                            />
                        </div>
                        <hr className="h-px my-1 bg-gray-200 border-0 dark:bg-gray-700" />
                    </div>
                </div>
            )}
            {!settingsIsOpen && (
                <div
                    className="opacity-80 bg-slate-200 text-xs flex flex-row text-center absolute border-2 p-1 w-55  bottom-0 z-10 right-0 "
                    onClick={() => setSettingsIsOpen(!settingsIsOpen)}
                >
                    <div className="mx-10">View settings</div>
                    <div>
                        <ChevronUpIcon className="h-5 w-5" />
                    </div>
                </div>
            )}
            <div className="z-1">
                <SubsurfaceViewer
                    id="deckgl"
                    layers={layers}
                    views={{
                        layout: [1, 1],
                        showLabel: false,
                        viewports: [
                            {
                                id: "view_1",
                                isSync: true,
                                show3D: true,
                                layerIds: ["axes-layer", "mesh-layer"],
                            },
                        ],
                    }}
                />
            </div>
        </div>
    );
}
type LabelledSwitchProps = {
    label: string;
    checked: boolean;
    onChange: any;
};
function LabelledSwitch(props: LabelledSwitchProps): JSX.Element {
    return (
        <Label wrapperClassName="flex text-xs flex-row mt-2" text={props.label}>
            <div className="mx-4">
                <Switch onChange={props.onChange} checked={props.checked} />
            </div>
        </Label>
    );
}
function createSurfaceMeshLayer(
    surfData: SurfaceData_api,
    showContours: boolean,
    showGrid: boolean,
    smoothShading: boolean,
    showMaterial: boolean
): Record<string, unknown> {
    return {
        "@@type": "MapLayer",
        id: "mesh-layer",
        meshData: JSON.parse(surfData.mesh_data),
        frame: {
            origin: [surfData.x_ori, surfData.y_ori],
            count: [surfData.x_count, surfData.y_count],
            increment: [surfData.x_inc, surfData.y_inc],
            rotDeg: surfData.rot_deg,
        },

        contours: showContours ? [0, 100] : false,
        isContoursDepth: showContours,
        gridLines: showGrid,
        material: showMaterial,
        smoothShading: smoothShading,
        colorMapName: "Physics",
    };
}
