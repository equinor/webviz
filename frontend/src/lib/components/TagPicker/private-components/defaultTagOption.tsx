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
};

export function DefaultTagOption(props: TagOptionProps): React.ReactNode {
    return (
        <>
            <li
                className={resolveClassNames("-mx-2 px-2 flex items-center", { "bg-blue-100": props.isFocused })}
                style={{ height: props.height }}
            >
                <Checkbox
                    className="w-full"
                    checked={props.isSelected}
                    label={props.label ?? props.value}
                    onChange={props.onToggle}
                />
            </li>
        </>
    );
}
