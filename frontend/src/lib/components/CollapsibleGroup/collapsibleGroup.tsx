import React from "react";

import { ExpandLess, ExpandMore } from "@mui/icons-material";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { BaseComponentProps } from "../BaseComponent";
import { BaseComponent } from "../BaseComponent";

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
        <BaseComponent ref={ref} disabled={props.disabled} className="shadow-sm">
            <div
                className={resolveClassNames(
                    "flex flex-row justify-between items-center bg-slate-100 cursor-pointer p-2 select-none gap-2",
                    { "border-b": expanded },
                )}
                onClick={handleClick}
                title={expanded ? "Collapse" : "Expand"}
            >
                {props.icon && React.cloneElement(props.icon, { className: "w-4 h-4" })}
                <h3 className="text-sm font-semibold grow leading-none">{props.title}</h3>
                {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
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
