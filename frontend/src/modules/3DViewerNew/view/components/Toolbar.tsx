import React from "react";

import PathIconSvg from "@assets/path.svg";
import { Icon } from "@equinor/eds-core-react";
import { IconData } from "@equinor/eds-icons";
import { Button } from "@lib/components/Button";
import { HoldPressedIntervalCallbackButton } from "@lib/components/HoldPressedIntervalCallbackButton/holdPressedIntervalCallbackButton";
import { ToggleButton } from "@lib/components/ToggleButton";
import { Toolbar as GenericToolbar, ToolBarDivider } from "@modules/_shared/components/Toolbar";
import { Add, FilterCenterFocus, GridOff, GridOn, Remove } from "@mui/icons-material";

const PathIcon: IconData = {
    name: "path",
    prefix: "path",
    height: "24",
    width: "24",
    svgPathData: PathIconSvg,
};

export type ToolbarProps = {
    verticalScale: number;
    polylineEditingActive: boolean;
    onFitInView: () => void;
    onGridVisibilityChange: (visible: boolean) => void;
    onToggleEditPolyline: () => void;
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
            <ToggleButton
                onToggle={props.onToggleEditPolyline}
                title="Edit polylines"
                active={props.polylineEditingActive}
            >
                <Icon data={PathIcon} />
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
        </GenericToolbar>
    );
}
