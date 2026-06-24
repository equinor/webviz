import type React from "react";

import { HelpOutline, Mouse } from "@mui/icons-material";

import { Popover } from "@lib/newComponents/Popover";

import { useDpfSubsurfaceViewerContext } from "../DpfSubsurfaceViewerWrapper";

export function ControlsInfoPopover(): React.ReactNode {
    const context = useDpfSubsurfaceViewerContext();

    return (
        <Popover.Root>
            <Popover.Trigger size="small" variant="ghost" iconOnly title="Help">
                <HelpOutline />
            </Popover.Trigger>

            <Popover.Popup align="start">
                <Popover.Title>
                    <Mouse className="align-sub" /> Camera mouse controls
                </Popover.Title>
                <Popover.Content as="div">
                    <ul className="pl-md list-disc">
                        {context.visualizationMode === "2D" ? <ControlsInfo2D /> : <ControlsInfo3D />}
                    </ul>
                </Popover.Content>
            </Popover.Popup>
        </Popover.Root>
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
