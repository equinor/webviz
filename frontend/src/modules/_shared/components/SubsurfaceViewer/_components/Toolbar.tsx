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

import { AddPathPointIcon, AxesLayerIcon, DrawPathIcon, RemovePathPointIcon } from "@lib/icons/";
import { Button } from "@lib/newComponents/Button";
import { Separator } from "@lib/newComponents/Separator";
import { TextInput } from "@lib/newComponents/TextInput";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Toolbar as GenericToolbar } from "@modules/_shared/components/Toolbar";
import { type PolylinesPlugin, PolylinesPluginTopic } from "@modules/_shared/utils/subsurfaceViewer/PolylinesPlugin";
import { PolylineEditingMode } from "@modules/_shared/utils/subsurfaceViewer/PolylinesPlugin";

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
            <div className="items-left text-md flex flex-col justify-start gap-1">
                <div className="flex items-center justify-start gap-1">
                    <Button
                        onClick={handleFitInViewClick}
                        title="Reset view to fit all objects"
                        iconOnly
                        size="small"
                        variant="text"
                    >
                        <FilterCenterFocus fontSize="inherit" />
                    </Button>
                    <div
                        className={resolveClassNames("items-center justify-start gap-1", expanded ? "flex" : "hidden")}
                    >
                        <Button
                            onClick={handleGridToggle}
                            title="Toggle axes visibility"
                            pressed={gridVisible}
                            iconOnly
                            size="small"
                            variant="text"
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
                            variant="text"
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
                                    variant="text"
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
                                    variant="text"
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
                        variant="text"
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
                        <div className="text-md gap-horizontal-3xs bg-canvas py-vertical-3xs flex w-full items-center">
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
                                variant="text"
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
                                variant="text"
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
                                variant="text"
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
                                variant="text"
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
