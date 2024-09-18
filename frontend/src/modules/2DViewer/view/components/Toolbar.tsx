import { Button } from "@lib/components/Button";
import { HoldPressedIntervalCallbackButton } from "@lib/components/HoldPressedIntervalCallbackButton/holdPressedIntervalCallbackButton";
import { Toolbar as GenericToolbar, ToolBarDivider } from "@modules/_shared/components/Toolbar";
import { Add, FilterCenterFocus, Remove } from "@mui/icons-material";

export type ToolbarProps = {
    verticalScale: number;
    onFitInView: () => void;
    onVerticalScaleIncrease: () => void;
    onVerticalScaleDecrease: () => void;
};

export function Toolbar(props: ToolbarProps): React.ReactNode {
    function handleFitInViewClick() {
        props.onFitInView();
    }

    function handleVerticalScaleIncrease() {
        props.onVerticalScaleIncrease();
    }

    function handleVerticalScaleDecrease() {
        props.onVerticalScaleDecrease();
    }

    return (
        <GenericToolbar>
            <Button onClick={handleFitInViewClick} title="Focus top view">
                <FilterCenterFocus fontSize="inherit" />
            </Button>
            <ToolBarDivider />
            <HoldPressedIntervalCallbackButton
                onHoldPressedIntervalCallback={handleVerticalScaleIncrease}
                title="Increase vertical scale"
            >
                <Add fontSize="inherit" />
            </HoldPressedIntervalCallbackButton>
            <span title="Vertical scale">{props.verticalScale.toFixed(2)}</span>
            <HoldPressedIntervalCallbackButton
                onHoldPressedIntervalCallback={handleVerticalScaleDecrease}
                title="Decrease vertical scale"
            >
                <Remove fontSize="inherit" />
            </HoldPressedIntervalCallbackButton>
        </GenericToolbar>
    );
}
