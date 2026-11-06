import { KeyboardDoubleArrowLeft, KeyboardDoubleArrowRight } from "@mui/icons-material";

export type CollapseHeaderProps = {
    isCollapsed: boolean;
    onCollapseChange: () => void;
};

export function CollapseHeader(props: CollapseHeaderProps) {
    return (
        <div
            onClick={props.onCollapseChange}
            className="bg-neutral-strong text-neutral-strong-on-emphasis p-3xs flex cursor-pointer items-center justify-end"
        >
            {props.isCollapsed ? <KeyboardDoubleArrowRight /> : <KeyboardDoubleArrowLeft />}
        </div>
    );
}
