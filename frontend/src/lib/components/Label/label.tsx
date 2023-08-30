import React from "react";

import { LinkIcon } from "@heroicons/react/20/solid";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { v4 } from "uuid";

export type LabelProps = {
    text: string;
    children: React.ReactElement;
    wrapperClassName?: string;
    labelClassName?: string;
    synced?: boolean;
    position?: "above" | "left";
};

export const Label: React.FC<LabelProps> = (props) => {
    const id = React.useRef<string>(`label-${v4()}`);

    return (
        <div
            className={resolveClassNames(props.wrapperClassName ?? "", {
                "flex flex-col": props.position === "above" && props.position === undefined,
                "flex flex-row items-center gap-4": props.position === "left",
            })}
        >
            <label
                className={resolveClassNames(
                    "flex",
                    "items-center",
                    "text-sm",
                    "mb-1",
                    "text-gray-500",
                    "leading-0",
                    props.labelClassName ?? ""
                )}
                htmlFor={props.children.props.id ?? id.current}
            >
                {props.synced && (
                    <span
                        className="bg-indigo-700 w-5 h-5 flex justify-center items-center rounded mr-2"
                        title={`"${props.text}" is synced on the current page`}
                    >
                        <LinkIcon className="w-4 h-4 text-white" />
                    </span>
                )}
                {props.text}
            </label>
            <div className={resolveClassNames({ "flex-grow": props.position === "left" })}>
                {props.children.props.id ? props.children : React.cloneElement(props.children, { id: id.current })}
            </div>
        </div>
    );
};

Label.displayName = "Label";
