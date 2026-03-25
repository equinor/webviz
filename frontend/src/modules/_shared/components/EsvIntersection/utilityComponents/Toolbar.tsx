import React from "react";

import {
    Add,
    FilterCenterFocus,
    GridOn,
    KeyboardDoubleArrowLeft,
    KeyboardDoubleArrowRight,
    Remove,
} from "@mui/icons-material";

import { Button } from "@lib/components/Button";
import { HoldPressedIntervalCallbackButton } from "@lib/components/HoldPressedIntervalCallbackButton/holdPressedIntervalCallbackButton";
import { ToggleButton } from "@lib/components/ToggleButton";
import { Toolbar as GenericToolbar, ToolBarDivider } from "@modules/_shared/components/Toolbar";

export enum FitInViewStatus {
    ON = "ON",
    OFF = "OFF",
}

export type ToolbarProps = {
    visible: boolean;
    zFactor: number;
    gridVisible: boolean;
    fitInViewStatus: FitInViewStatus;
    onFitInViewStatusToggle: (status: FitInViewStatus) => void;
    onGridLinesToggle: (active: boolean) => void;
    onVerticalScaleIncrease: () => void;
    onVerticalScaleDecrease: () => void;
};

export function Toolbar(props: ToolbarProps): React.ReactNode {
    const [expanded, setExpanded] = React.useState<boolean>(false);

    function handleFitInViewToggle(active: boolean) {
        props.onFitInViewStatusToggle(active ? FitInViewStatus.ON : FitInViewStatus.OFF);
    }

    function handleGridVisibilityToggle(active: boolean) {
        props.onGridLinesToggle(active);
    }

    function handleVerticalScaleIncrease() {
        props.onVerticalScaleIncrease();
    }

    function handleVerticalScaleDecrease() {
        props.onVerticalScaleDecrease();
    }

    if (!props.visible) {
        return null;
    }

    return (
        <GenericToolbar>
            <div className="flex items-center gap-1 justify-start">
                <ToggleButton
                    onToggle={handleFitInViewToggle}
                    title="Fit in view"
                    active={props.fitInViewStatus === FitInViewStatus.ON}
                >
                    <FilterCenterFocus fontSize="inherit" />
                </ToggleButton>
                {expanded && (
                    <>
                        <ToggleButton
                            onToggle={handleGridVisibilityToggle}
                            title="Toggle grid visibility"
                            active={props.gridVisible}
                        >
                            <GridOn fontSize="inherit" />
                        </ToggleButton>
                        <ToolBarDivider />
                        <HoldPressedIntervalCallbackButton
                            onHoldPressedIntervalCallback={handleVerticalScaleIncrease}
                            title="Increase vertical scale"
                        >
                            <Add fontSize="inherit" />
                        </HoldPressedIntervalCallbackButton>
                        <span title="Vertical scale">{props.zFactor}</span>
                        <HoldPressedIntervalCallbackButton
                            onHoldPressedIntervalCallback={handleVerticalScaleDecrease}
                            title="Decrease vertical scale"
                        >
                            <Remove fontSize="inherit" />
                        </HoldPressedIntervalCallbackButton>
                    </>
                )}
                <ToolBarDivider />
                <Button title={expanded ? "Collapse toolbar" : "Expand toolbar"} onClick={() => setExpanded(!expanded)}>
                    {expanded ? (
                        <KeyboardDoubleArrowLeft fontSize="inherit" />
                    ) : (
                        <KeyboardDoubleArrowRight fontSize="inherit" />
                    )}
                </Button>
            </div>
        </GenericToolbar>
    );
}
