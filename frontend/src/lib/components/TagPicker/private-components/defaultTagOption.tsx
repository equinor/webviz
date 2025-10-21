import type React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { Checkbox } from "../../Checkbox";

export type TagOptionProps = {
    value: string;
    label: string | undefined;
    isSelected: boolean;
    isFocused: boolean;
    height: number;
    onToggle: () => void;
    onHover: () => void;
};

export function DefaultTagOption(props: TagOptionProps): React.ReactNode {
    return (
        <>
            <li
                className={resolveClassNames("-mx-2 flex items-center", { "bg-blue-100": props.isFocused })}
                style={{ height: props.height }}
                onMouseMove={props.onHover}
            >
                <label className="flex size-full px-2 py-1 text-gray-900 cursor-pointer gap-2">
                    <Checkbox className="w-full" checked={props.isSelected} onChange={props.onToggle} />
                    {props.label ?? props.value}
                </label>
            </li>
        </>
    );
}
