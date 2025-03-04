import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Link } from "@mui/icons-material";

import { v4 } from "uuid";

export type LabelProps = {
    text: string;
    title?: string;
    children: React.ReactElement;
    wrapperClassName?: string;
    labelClassName?: string;
    synced?: boolean;
    position?: "above" | "left" | "right";
};

export const Label: React.FC<LabelProps> = (props) => {
    const id = React.useRef<string>(`label-${v4()}`);

    return (
        <div
            className={resolveClassNames(props.wrapperClassName ?? "", {
                "flex flex-col": props.position === "above" && props.position === undefined,
                "flex flex-row items-center gap-4": props.position === "left",
                "flex items-center flex-row-reverse gap-4": props.position === "right",
            })}
            title={props.title}
        >
            <label
                className={resolveClassNames(
                    "flex",
                    "items-center",
                    "text-sm",
                    "mb-1",
                    "text-gray-500",
                    "leading-0",
                    props.labelClassName ?? "",
                )}
                htmlFor={props.children.props.id ?? id.current}
            >
                {props.synced && (
                    <span
                        className="bg-indigo-700 w-5 h-5 flex justify-center items-center rounded mr-2"
                        title={`"${props.text}" is synced on the current page`}
                    >
                        <Link fontSize="small" className="text-white" />
                    </span>
                )}
                {props.text}
            </label>
            <div
                className={resolveClassNames({ "flex-grow": props.position === "left" || props.position === "right" })}
            >
                {props.children.props.id ? props.children : React.cloneElement(props.children, { id: id.current })}
            </div>
        </div>
    );
};

Label.displayName = "Label";
