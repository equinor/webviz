import React from "react";

import { ExpandLess, ExpandMore } from "@mui/icons-material";

import { Tooltip } from "@lib/components/Tooltip";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { BaseComponentProps } from "../BaseComponent";
import { BaseComponent } from "../BaseComponent";
import { DenseIconButton } from "../DenseIconButton";

export type CollapsibleGroupProps = {
    icon?: React.ReactElement;
    title: string;
    children: React.ReactNode;
    expanded?: boolean;
    onChange?: (expanded: boolean) => void;
} & BaseComponentProps;

function CollapsibleGroupComponent(props: CollapsibleGroupProps, ref: React.ForwardedRef<HTMLDivElement>) {
    const [expanded, setExpanded] = React.useState(props.expanded ?? false);
    const [prevExpanded, setPrevExpanded] = React.useState<boolean | undefined>(props.expanded);

    if (prevExpanded !== props.expanded) {
        setExpanded(props.expanded ?? false);
        setPrevExpanded(props.expanded ?? false);
    }

    const handleClick = () => {
        setExpanded(!expanded);
        props.onChange?.(!expanded);
    };

    return (
        <BaseComponent ref={ref} disabled={props.disabled}>
            <div
                className={resolveClassNames(
                    "flex flex-row justify-between items-center bg-slate-100 cursor-pointer p-1.5 select-none gap-2 hover:bg-slate-200 shadow-sm",
                )}
                onClick={handleClick}
            >
                {props.icon && React.cloneElement(props.icon, { className: "w-4 h-4" })}
                <h3 className="text-sm font-semibold grow leading-none">{props.title}</h3>
                <Tooltip title={expanded ? "Collapse" : "Expand"}>
                    <DenseIconButton aria-label={expanded ? "Collapse" : "Expand"} onClick={handleClick}>
                        {expanded ? <ExpandLess fontSize="inherit" /> : <ExpandMore fontSize="inherit" />}
                    </DenseIconButton>
                </Tooltip>
            </div>
            <div
                className={resolveClassNames("p-2", {
                    hidden: !expanded,
                })}
            >
                {props.children}
            </div>
        </BaseComponent>
    );
}

export const CollapsibleGroup = React.forwardRef(CollapsibleGroupComponent);
