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
            <button
                type="button"
                onClick={props.onCollapseChange}
                className="bg-neutral fill-text-neutral-strong p-3xs hover:bg-neutral-hover active:bg-neutral-active focusable flex cursor-pointer items-center justify-end focus-visible:outline-0"
                aria-label={props.isCollapsed ? "Expand settings panel" : "Collapse settings panel"}
                aria-expanded={!props.isCollapsed}
            >
                {props.isCollapsed ? <KeyboardDoubleArrowRight /> : <KeyboardDoubleArrowLeft />}
            </button>
        </Tooltip>
    );
}
