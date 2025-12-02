import React from "react";

import { Info, Mouse } from "@mui/icons-material";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useDpfSubsurfaceViewerContext } from "../DpfSubsurfaceViewerWrapper";

export function ControlsInfoBox() {
    const context = useDpfSubsurfaceViewerContext();

    const [expanded, setExpanded] = React.useState<boolean>(false);

    function toggleExpanded() {
        setExpanded((prev) => !prev);
    }

    return (
        <div
            className={resolveClassNames(
                "absolute top-16 right-4 bg-black/50 text-white p-2 rounded-lg z-40 hover:outline-2 hover:outline-blue-300",
                {
                    "w-64": expanded,
                    "w-10": !expanded,
                },
            )}
            onClick={toggleExpanded}
            title="Controls information - Click to expand or collapse"
            style={{ cursor: "pointer" }}
        >
            <Mouse fontSize="medium" />
            <Info fontSize="medium" />
            {expanded && (
                <div className="mt-2 text-sm">
                    <p className="font-bold">Mouse controls:</p>
                    <ul className="list-disc pl-4">
                        {context.visualizationMode === "2D" ? <ControlsInfo2D /> : <ControlsInfo3D />}
                    </ul>
                </div>
            )}
        </div>
    );
}

function ControlsInfo2D() {
    return (
        <>
            <li>Click and drag to pan the view</li>
            <li>Scroll to zoom in and out</li>
        </>
    );
}

function ControlsInfo3D() {
    return (
        <>
            <li>Click and drag to rotate the view</li>
            <li>Scroll to zoom in and out</li>
            <li>Right-click and drag to pan the view</li>
            <li>Double-click on an object to set focus</li>
        </>
    );
}
