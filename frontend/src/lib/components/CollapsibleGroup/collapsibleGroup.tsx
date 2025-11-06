import React from "react";

import { Error, ExpandLess, ExpandMore, Warning } from "@mui/icons-material";

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
    hasError?: boolean;
    hasWarning?: boolean;
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
                    "flex flex-row justify-between items-center cursor-pointer p-1.5 select-none gap-2 shadow-sm",
                    { "bg-slate-100 hover:bg-slate-200": !props.hasError && !props.hasWarning },
                    { "bg-red-100 hover:bg-red-200": props.hasError },
                    { "bg-yellow-100 hover:bg-yellow-200": props.hasWarning && !props.hasError },
                )}
                onClick={handleClick}
            >
                {props.icon && React.cloneElement(props.icon, { className: "w-4 h-4" })}
                <h3 className="text-sm font-semibold grow leading-none">{props.title}</h3>
                {(props.hasError || props.hasWarning) && (
                    <Tooltip title={`There are ${props.hasError ? "errors" : "warnings"} in this section`}>
                        {props.hasError ? (
                            <Error fontSize="inherit" color="error" />
                        ) : (
                            <Warning fontSize="inherit" color="warning" />
                        )}
                    </Tooltip>
                )}
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
