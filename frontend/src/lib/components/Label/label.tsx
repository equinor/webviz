import React from "react";

import { v4 } from "uuid";

import { resolveClassNames } from "../_utils/resolveClassNames";

export type LabelProps = {
    text: string;
    children: React.ReactElement;
    wrapperClassName?: string;
    labelClassName?: string;
};

export const Label: React.FC<LabelProps> = (props) => {
    const id = React.useRef<string>(`label-${v4()}`);

    return (
        <div className={props.wrapperClassName}>
            <label
                className={resolveClassNames("text-sm", "text-gray-500", props.labelClassName ?? "")}
                htmlFor={props.children.props.id ?? id.current}
            >
                {props.text}
            </label>
            {props.children.props.id ? props.children : React.cloneElement(props.children, { id: id.current })}
        </div>
    );
};

Label.displayName = "Label";
