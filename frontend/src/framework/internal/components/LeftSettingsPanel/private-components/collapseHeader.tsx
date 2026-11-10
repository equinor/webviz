import { KeyboardDoubleArrowLeft, KeyboardDoubleArrowRight } from "@mui/icons-material";

import { Tooltip } from "@lib/components/Tooltip";

export type CollapseHeaderProps = {
    isCollapsed: boolean;
    onCollapseChange: () => void;
};

export function CollapseHeader(props: CollapseHeaderProps) {
    return (
        <Tooltip
            content={props.isCollapsed ? "Expand settings panel" : "Collapse settings panel"}
            delay="medium"
            side="right"
        >
            <div
                onClick={props.onCollapseChange}
                className="bg-neutral fill-text-neutral-strong p-3xs hover:bg-neutral-hover active:bg-neutral-active flex cursor-pointer items-center justify-end"
                aria-label={props.isCollapsed ? "Expand settings panel" : "Collapse settings panel"}
            >
                {props.isCollapsed ? <KeyboardDoubleArrowRight /> : <KeyboardDoubleArrowLeft />}
            </div>
        </Tooltip>
    );
}
