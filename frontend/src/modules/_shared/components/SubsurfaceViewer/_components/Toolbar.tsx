import React from "react";

import {
    Add,
    Check,
    FilterCenterFocus,
    KeyboardDoubleArrowLeft,
    KeyboardDoubleArrowRight,
    Polyline,
    Remove,
} from "@mui/icons-material";

import { Button } from "@lib/components/Button";
import { Separator } from "@lib/components/Separator";
import { TextInput } from "@lib/components/TextInput";
import { AddPathPointIcon, AxesLayerIcon, DrawPathIcon, RemovePathPointIcon } from "@lib/icons/";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Toolbar as GenericToolbar } from "@modules/_shared/components/Toolbar";
import { type PolylinesPlugin, PolylinesPluginTopic } from "@modules/_shared/utils/subsurfaceViewer/PolylinesPlugin";
import { PolylineEditingMode } from "@modules/_shared/utils/subsurfaceViewer/PolylinesPlugin";

import { ControlsInfoPopover } from "./ControlsInfoPopover";

export type ToolbarProps = {
    hideVerticalScaleControls?: boolean;
    verticalScale: number;
    hasActivePolyline: boolean;
    activePolylineName?: string;
    onFitInView: () => void;
    polylinesPlugin: PolylinesPlugin;
    onGridVisibilityChange: (visible: boolean) => void;
    onVerticalScaleChange(value: number): void;
    onPolylineNameChange(name: string): void;
};

export function Toolbar(props: ToolbarProps): React.ReactNode {
    const [expanded, setExpanded] = React.useState<boolean>(false);
    const [gridVisible, setGridVisible] = React.useState<boolean>(false);
    const [polylineName, setPolylineName] = React.useState<string | null>(null);
    const [prevEditingPolylineId, setPrevEditingPolylineId] = React.useState<string | null>(null);
    const polylineEditingMode = usePublishSubscribeTopicValue(props.polylinesPlugin, PolylinesPluginTopic.EDITING_MODE);
    const editingPolylineId = usePublishSubscribeTopicValue(
        props.polylinesPlugin,
        PolylinesPluginTopic.EDITING_POLYLINE_ID,
    );

    if (editingPolylineId !== prevEditingPolylineId) {
        setPrevEditingPolylineId(editingPolylineId);
        const activePolyline = props.polylinesPlugin.getActivePolyline();
        if (activePolyline) {
            setPolylineName(activePolyline.name);
        }
    }

    function handleFitInViewClick() {
        props.onFitInView();
    }

    function handleGridToggle() {
        props.onGridVisibilityChange(!gridVisible);
        setGridVisible(!gridVisible);
    }

    function handleVerticalScaleIncrease() {
        props.onVerticalScaleChange(props.verticalScale + 1);
    }

    function handleVerticalScaleDecrease() {
        props.onVerticalScaleChange(props.verticalScale - 1);
    }

    function handleTogglePolylineEditing() {
        if (polylineEditingMode !== PolylineEditingMode.DISABLED) {
            props.polylinesPlugin.setEditingMode(PolylineEditingMode.DISABLED);
            return;
        }
        props.polylinesPlugin.setEditingMode(PolylineEditingMode.DRAW);
    }

    function handlePolylineEditingModeChange(mode: PolylineEditingMode) {
        props.polylinesPlugin.setEditingMode(mode);
    }

    function handlePolylineNameChange(event: React.ChangeEvent<HTMLInputElement>) {
        setPolylineName(event.target.value);
    }

    function handleSavePolylineClick() {
        if (!polylineName) {
            return;
        }
        props.polylinesPlugin.setEditingMode(PolylineEditingMode.IDLE);
        props.onPolylineNameChange(polylineName);
        props.polylinesPlugin.handleClickAway();
    }

    return (
        <GenericToolbar>
            <div className="items-left text-md gap-4xs flex flex-col justify-start">
                <div className="gap-4xs flex items-center justify-start">
                    <ControlsInfoPopover />
                    <Button
                        onClick={handleFitInViewClick}
                        title="Reset view to fit all objects"
                        iconOnly
                        size="small"
                        variant="ghost"
                    >
                        <FilterCenterFocus fontSize="inherit" />
                    </Button>
                    <div
                        className={resolveClassNames(
                            "gap-4xs items-center justify-start",
                            expanded ? "flex" : "hidden",
                        )}
                    >
                        <Button
                            onClick={handleGridToggle}
                            title="Toggle axes visibility"
                            pressed={gridVisible}
                            iconOnly
                            size="small"
                            variant="ghost"
                        >
                            <AxesLayerIcon fontSize="inherit" />
                        </Button>
                        <Separator orientation="vertical" />
                        <Button
                            onClick={handleTogglePolylineEditing}
                            title="Edit polylines"
                            pressed={polylineEditingMode !== PolylineEditingMode.DISABLED}
                            iconOnly
                            size="small"
                            variant="ghost"
                        >
                            <Polyline fontSize="inherit" />
                        </Button>
                        {!props.hideVerticalScaleControls && (
                            <>
                                <Separator orientation="vertical" />
                                <Button
                                    onClick={handleVerticalScaleDecrease}
                                    title="Decrease vertical scale"
                                    iconOnly
                                    size="small"
                                    variant="ghost"
                                >
                                    <Remove fontSize="inherit" />
                                </Button>
                                <span title="Vertical scale" className="w-8 text-center">
                                    {props.verticalScale}
                                </span>
                                <Button
                                    onClick={handleVerticalScaleIncrease}
                                    title="Increase vertical scale"
                                    iconOnly
                                    size="small"
                                    variant="ghost"
                                >
                                    <Add fontSize="inherit" />
                                </Button>
                            </>
                        )}
                    </div>
                    <Separator orientation="vertical" />
                    <Button
                        title={expanded ? "Collapse toolbar" : "Expand toolbar"}
                        onClick={() => setExpanded(!expanded)}
                        iconOnly
                        size="small"
                        variant="ghost"
                    >
                        {expanded ? (
                            <KeyboardDoubleArrowLeft fontSize="inherit" />
                        ) : (
                            <KeyboardDoubleArrowRight fontSize="inherit" />
                        )}
                    </Button>
                </div>
                {polylineEditingMode !== PolylineEditingMode.DISABLED && expanded && (
                    <>
                        <div className="text-md gap-x-3xs bg-canvas py-3xs flex w-full items-center">
                            <Button
                                pressed={polylineEditingMode === PolylineEditingMode.DRAW}
                                title="Draw polyline"
                                onClick={() =>
                                    handlePolylineEditingModeChange(
                                        polylineEditingMode === PolylineEditingMode.DRAW
                                            ? PolylineEditingMode.IDLE
                                            : PolylineEditingMode.DRAW,
                                    )
                                }
                                iconOnly
                                size="small"
                                variant="ghost"
                            >
                                <DrawPathIcon fontSize="inherit" />
                            </Button>
                            <Button
                                pressed={polylineEditingMode === PolylineEditingMode.ADD_POINT}
                                disabled={!editingPolylineId}
                                title="Add point"
                                onClick={() =>
                                    handlePolylineEditingModeChange(
                                        polylineEditingMode === PolylineEditingMode.ADD_POINT
                                            ? PolylineEditingMode.IDLE
                                            : PolylineEditingMode.ADD_POINT,
                                    )
                                }
                                iconOnly
                                size="small"
                                variant="ghost"
                            >
                                <AddPathPointIcon fontSize="inherit" />
                            </Button>
                            <Button
                                pressed={polylineEditingMode === PolylineEditingMode.REMOVE_POINT}
                                disabled={!editingPolylineId}
                                title="Remove point"
                                onClick={() =>
                                    handlePolylineEditingModeChange(
                                        polylineEditingMode === PolylineEditingMode.REMOVE_POINT
                                            ? PolylineEditingMode.IDLE
                                            : PolylineEditingMode.REMOVE_POINT,
                                    )
                                }
                                iconOnly
                                size="small"
                                variant="ghost"
                            >
                                <RemovePathPointIcon fontSize="inherit" />
                            </Button>
                            <TextInput
                                disabled={!editingPolylineId}
                                value={editingPolylineId ? (polylineName ?? "") : ""}
                                onChange={handlePolylineNameChange}
                                placeholder="Polyline name"
                                size="small"
                            />
                            <Button
                                title={"Save polyline"}
                                onClick={handleSavePolylineClick}
                                disabled={!editingPolylineId}
                                iconOnly
                                size="small"
                                variant="ghost"
                            >
                                <Check fontSize="inherit" />
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </GenericToolbar>
    );
}
