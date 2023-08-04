import React from "react";

import { LinkIcon } from "@heroicons/react/20/solid";

import { v4 } from "uuid";

import { resolveClassNames } from "../_utils/resolveClassNames";

export type LabelProps = {
    text: string;
    children: React.ReactElement;
    wrapperClassName?: string;
    labelClassName?: string;
    synced?: boolean;
};

export const Label: React.FC<LabelProps> = (props) => {
    const id = React.useRef<string>(`label-${v4()}`);

    return (
        <div className={props.wrapperClassName}>
            <label
                className={resolveClassNames(
                    "flex",
                    "items-center",
                    "text-sm",
                    "mb-1",
                    "text-gray-500",
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
            {props.children.props.id ? props.children : React.cloneElement(props.children, { id: id.current })}
        </div>
    );
};

Label.displayName = "Label";
