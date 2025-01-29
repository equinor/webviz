import React from "react";

import { Button } from "@lib/components/Button";
import { HoldPressedIntervalCallbackButton } from "@lib/components/HoldPressedIntervalCallbackButton/holdPressedIntervalCallbackButton";
import { Input } from "@lib/components/Input";
import { ToggleButton } from "@lib/components/ToggleButton";
import { AddPathPointIcon, DrawPathIcon, RemovePathPointIcon } from "@lib/icons/";
import { Toolbar as GenericToolbar, ToolBarDivider } from "@modules/_shared/components/Toolbar";
import { usePublishSubscribeTopicValue } from "@modules/_shared/utils/PublishSubscribeDelegate";
import { Add, FilterCenterFocus, GridOff, GridOn, Polyline, Remove } from "@mui/icons-material";

import { PolylineEditingMode } from "../hooks/editablePolylines/types";
import { PolylinesPlugin, PolylinesPluginTopic } from "../utils/PolylinesPlugin";

export type ToolbarProps = {
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
    const [gridVisible, setGridVisible] = React.useState<boolean>(false);
    const [polylineName, setPolylineName] = React.useState<string | null>(null);
    const [prevEditingPolylineId, setPrevEditingPolylineId] = React.useState<string | null>(null);
    const polylineEditingMode = usePublishSubscribeTopicValue(props.polylinesPlugin, PolylinesPluginTopic.EDITING_MODE);
    const editingPolylineId = usePublishSubscribeTopicValue(
        props.polylinesPlugin,
        PolylinesPluginTopic.EDITING_POLYLINE_ID
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
        props.onVerticalScaleChange(props.verticalScale + 0.1);
    }

    function handleVerticalScaleDecrease() {
        props.onVerticalScaleChange(props.verticalScale - 0.1);
    }

    function handleTogglePolylineEditing() {
        if (polylineEditingMode !== PolylineEditingMode.NONE) {
            props.polylinesPlugin.setEditingMode(PolylineEditingMode.NONE);
            return;
        }
        props.polylinesPlugin.setEditingMode(PolylineEditingMode.IDLE);
    }

    function handlePolylineEditingModeChange(mode: PolylineEditingMode) {
        props.polylinesPlugin.setEditingMode(mode);
    }

    function handlePolylineNameChange(event: React.ChangeEvent<HTMLInputElement>) {
        props.polylinesPlugin.setActivePolylineName(event.target.value);
    }

    return (
        <GenericToolbar>
            <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1">
                    <Button onClick={handleFitInViewClick} title="Focus top view">
                        <FilterCenterFocus fontSize="inherit" />
                    </Button>
                    <ToggleButton onToggle={handleGridToggle} title="Toggle grid" active={gridVisible}>
                        {gridVisible ? <GridOn fontSize="inherit" /> : <GridOff fontSize="inherit" />}
                    </ToggleButton>
                    <ToolBarDivider />
                    <ToggleButton
                        onToggle={handleTogglePolylineEditing}
                        title="Edit polylines"
                        active={polylineEditingMode !== PolylineEditingMode.NONE}
                    >
                        <Polyline fontSize="inherit" />
                    </ToggleButton>
                    <ToolBarDivider />
                    <HoldPressedIntervalCallbackButton
                        onHoldPressedIntervalCallback={handleVerticalScaleDecrease}
                        title="Decrease vertical scale"
                    >
                        <Remove fontSize="inherit" />
                    </HoldPressedIntervalCallbackButton>
                    <span title="Vertical scale" className="w-8 text-center">
                        {props.verticalScale.toFixed(2)}
                    </span>
                    <HoldPressedIntervalCallbackButton
                        onHoldPressedIntervalCallback={handleVerticalScaleIncrease}
                        title="Increase vertical scale"
                    >
                        <Add fontSize="inherit" />
                    </HoldPressedIntervalCallbackButton>
                </div>
                {polylineEditingMode !== PolylineEditingMode.NONE && (
                    <>
                        <div className="flex w-full items-center gap-1 text-lg p-2 bg-slate-100">
                            <ToggleButton
                                active={polylineEditingMode === PolylineEditingMode.DRAW}
                                title="Draw polyline"
                                onToggle={(active) =>
                                    handlePolylineEditingModeChange(
                                        active ? PolylineEditingMode.DRAW : PolylineEditingMode.IDLE
                                    )
                                }
                            >
                                <DrawPathIcon fontSize="inherit" />
                            </ToggleButton>
                            <ToggleButton
                                active={polylineEditingMode === PolylineEditingMode.ADD_POINT}
                                disabled={!props.hasActivePolyline}
                                title="Add point"
                                onToggle={(active) =>
                                    handlePolylineEditingModeChange(
                                        active ? PolylineEditingMode.ADD_POINT : PolylineEditingMode.IDLE
                                    )
                                }
                            >
                                <AddPathPointIcon fontSize="inherit" />
                            </ToggleButton>
                            <ToggleButton
                                active={polylineEditingMode === PolylineEditingMode.REMOVE_POINT}
                                disabled={!props.hasActivePolyline}
                                title="Remove point"
                                onToggle={(active) =>
                                    handlePolylineEditingModeChange(
                                        active ? PolylineEditingMode.REMOVE_POINT : PolylineEditingMode.IDLE
                                    )
                                }
                            >
                                <RemovePathPointIcon fontSize="inherit" />
                            </ToggleButton>
                            <Input
                                disabled={!polylineName}
                                value={polylineName ?? ""}
                                onChange={handlePolylineNameChange}
                            />
                        </div>
                    </>
                )}
            </div>
        </GenericToolbar>
    );
}
