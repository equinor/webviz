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

import { type ConfirmAction, ConfirmationService } from "@framework/ConfirmationService";
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
    // Re-renders whenever the active draft's path changes, e.g. as points are added/removed,
    // so canSaveActivePolyline below stays in sync.
    const activePolyline = usePublishSubscribeTopicValue(props.polylinesPlugin, PolylinesPluginTopic.ACTIVE_POLYLINE);

    if (editingPolylineId !== prevEditingPolylineId) {
        setPrevEditingPolylineId(editingPolylineId);
        // Read straight from the plugin rather than the ACTIVE_POLYLINE hook value above: the
        // plugin always mutates its draft before notifying either topic, so this is guaranteed
        // current, whereas ACTIVE_POLYLINE and EDITING_POLYLINE_ID are notified separately and
        // aren't guaranteed to land in the same render.
        const currentActivePolyline = props.polylinesPlugin.getActivePolyline();
        if (currentActivePolyline) {
            setPolylineName(currentActivePolyline.name);
        }
    }

    const canSaveActivePolyline = (activePolyline?.path.length ?? 0) >= 2;

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

    async function handleTogglePolylineEditing() {
        if (polylineEditingMode === PolylineEditingMode.DISABLED) {
            props.polylinesPlugin.setEditingMode(PolylineEditingMode.IDLE);
            return;
        }

        if (!editingPolylineId) {
            props.polylinesPlugin.setEditingMode(PolylineEditingMode.DISABLED);
            return;
        }

        const activeName = activePolyline?.name ?? "This polyline";
        const actions: ConfirmAction[] = canSaveActivePolyline
            ? [
                  { id: "keep-editing", label: "Keep editing" },
                  { id: "discard", label: "Discard", color: "danger" },
                  { id: "save", label: "Save", color: "primary" },
              ]
            : [
                  { id: "keep-editing", label: "Keep editing" },
                  { id: "discard", label: "Discard", color: "danger" },
              ];

        const result = await ConfirmationService.confirm({
            title: "Unsaved polyline",
            message: canSaveActivePolyline
                ? `"${activeName}" has not been saved. Do you want to save it before closing, or discard your changes?`
                : `"${activeName}" needs at least two points before it can be saved. Do you want to discard it?`,
            actions,
        });

        if (result === "save" && canSaveActivePolyline) {
            props.polylinesPlugin.saveActivePolyline(polylineName || activeName);
        } else if (result === "discard") {
            props.polylinesPlugin.discardActivePolyline();
        } else {
            return;
        }

        props.polylinesPlugin.setEditingMode(PolylineEditingMode.IDLE);
    }

    function handlePolylineEditingModeChange(mode: PolylineEditingMode) {
        props.polylinesPlugin.setEditingMode(mode);
    }

    function handlePolylineNameChange(event: React.ChangeEvent<HTMLInputElement>) {
        setPolylineName(event.target.value);
    }

    function handleSavePolylineClick() {
        if (!polylineName || !canSaveActivePolyline) {
            return;
        }
        props.polylinesPlugin.saveActivePolyline(polylineName);
    }

    return (
        <GenericToolbar>
            <div className="text-base-md gap-4xs flex flex-col items-start justify-start">
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
                                title={
                                    editingPolylineId && !canSaveActivePolyline
                                        ? "A polyline needs at least two points before it can be saved"
                                        : "Save polyline"
                                }
                                onClick={handleSavePolylineClick}
                                disabled={!editingPolylineId || !canSaveActivePolyline}
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
