import React from "react";

import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/20/solid";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { BaseComponent, BaseComponentProps } from "../BaseComponent";

export type CollapsibleGroupProps = {
    icon?: React.ReactElement;
    title: string;
    children: React.ReactNode;
    expanded?: boolean;
    onChange?: (expanded: boolean) => void;
} & BaseComponentProps;

export const CollapsibleGroup: React.FC<CollapsibleGroupProps> = (props) => {
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
        <BaseComponent disabled={props.disabled}>
            <div className="shadow">
                <div
                    className={resolveClassNames(
                        "flex flex-row justify-between items-center bg-slate-100 cursor-pointer p-2 select-none gap-2",
                        { "border-b": expanded }
                    )}
                    onClick={handleClick}
                    title={expanded ? "Collapse" : "Expand"}
                >
                    {props.icon && React.cloneElement(props.icon, { className: "w-4 h-4" })}
                    <h3 className="text-sm font-semibold flex-grow leading-none">{props.title}</h3>
                    {expanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                </div>
                <div
                    className={resolveClassNames("p-2", {
                        hidden: !expanded,
                    })}
                >
                    {props.children}
                </div>
            </div>
        </BaseComponent>
    );
};

CollapsibleGroup.displayName = "CollapsibleGroup";
