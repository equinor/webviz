import { Add, FilterCenterFocus, GridOn, Remove } from "@mui/icons-material";

import { HoldPressedIntervalCallbackButton } from "@lib/components/HoldPressedIntervalCallbackButton/holdPressedIntervalCallbackButton";
import { ToggleButton } from "@lib/components/ToggleButton";

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
        <div className="absolute left-0 top-0 bg-white p-1 rounded-sm border-gray-300 border shadow-sm z-30 text-sm flex flex-col gap-1 items-center">
            <ToggleButton
                onToggle={handleFitInViewToggle}
                title="Fit in view"
                active={props.fitInViewStatus === FitInViewStatus.ON}
            >
                <FilterCenterFocus fontSize="inherit" />
            </ToggleButton>
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
            <span title="Vertical scale">{props.zFactor.toFixed(2)}</span>
            <HoldPressedIntervalCallbackButton
                onHoldPressedIntervalCallback={handleVerticalScaleDecrease}
                title="Decrease vertical scale"
            >
                <Remove fontSize="inherit" />
            </HoldPressedIntervalCallbackButton>
        </div>
    );
}

function ToolBarDivider(): React.ReactNode {
    return <div className="w-full h-px bg-gray-300" />;
}
