import React from "react";

import { Button } from "@lib/components/Button";
import { HoldPressedIntervalCallbackButton } from "@lib/components/HoldPressedIntervalCallbackButton/holdPressedIntervalCallbackButton";
import { ToggleButton } from "@lib/components/ToggleButton";
import { Toolbar as GenericToolbar, ToolBarDivider } from "@modules/_shared/components/Toolbar";
import { Add, FilterCenterFocus, GridOff, GridOn, Polyline, Remove } from "@mui/icons-material";

export type ToolbarProps = {
    verticalScale: number;
    onFitInView: () => void;
    onGridVisibilityChange: (visible: boolean) => void;
    onEditPolyline: () => void;
    onVerticalScaleChange(value: number): void;
};

export function Toolbar(props: ToolbarProps): React.ReactNode {
    const [gridVisible, setGridVisible] = React.useState(false);

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

    return (
        <GenericToolbar>
            <Button onClick={handleFitInViewClick} title="Focus top view">
                <FilterCenterFocus fontSize="inherit" />
            </Button>
            <ToggleButton onToggle={handleGridToggle} title="Toggle grid" active={gridVisible}>
                {gridVisible ? <GridOn fontSize="inherit" /> : <GridOff fontSize="inherit" />}
            </ToggleButton>
            <ToolBarDivider />
            <Button onClick={props.onEditPolyline} title="Edit polylines">
                <Polyline fontSize="inherit" />
            </Button>
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
        </GenericToolbar>
    );
}
