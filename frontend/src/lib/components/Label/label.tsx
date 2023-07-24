import React from "react";

import { v4 } from "uuid";

import { resolveClassNames } from "../_utils/resolveClassNames";

export type LabelProps = {
    text: string;
    title?: string;
    children: React.ReactElement;
    wrapperClassName?: string;
    labelClassName?: string;
    startComponent?: React.ReactElement;
    endComponent?: React.ReactElement;
};

export const Label: React.FC<LabelProps> = (props) => {
    const id = React.useRef<string>(`label-${v4()}`);

    return (
        <div className={props.wrapperClassName}>
            <label
                className={resolveClassNames(
                    "text-sm",
                    "text-gray-500",
                    props.labelClassName ?? "",
                    "flex",
                    "gap-2",
                    "items-center"
                )}
                title={props.title}
                htmlFor={props.children.props.id ?? id.current}
            >
                {props.startComponent}
                {props.text}
                {props.endComponent}
            </label>
            {props.children.props.id ? props.children : React.cloneElement(props.children, { id: id.current })}
        </div>
    );
};

Label.displayName = "Label";
