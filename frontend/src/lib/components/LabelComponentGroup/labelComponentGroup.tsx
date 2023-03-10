import React from "react";

import { v4 } from "uuid";

import { resolveClassNames } from "../_utils/resolveClassNames";

export type LabelComponentGroupProps = {
    label: string;
    children: React.ReactElement;
    wrapperClassName?: string;
    labelClassName?: string;
};

export const LabelComponentGroup: React.FC<LabelComponentGroupProps> = (props) => {
    const id = React.useRef<string>(`label-comp-group-${v4()}`);

    return (
        <div className={props.wrapperClassName}>
            <label
                className={resolveClassNames("text-sm", "text-gray-500", props.labelClassName ?? "")}
                htmlFor={props.children.props.id ?? id.current}
            >
                {props.label}
            </label>
            {props.children.props.id ? props.children : React.cloneElement(props.children, { id: id.current })}
        </div>
    );
};
