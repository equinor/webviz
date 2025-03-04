import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { v4 } from "uuid";

import type { BaseComponentProps } from "../BaseComponent";
import { BaseComponent } from "../BaseComponent";

export type CheckboxProps = {
    id?: string;
    name?: string;
    label?: React.ReactNode;
    checked?: boolean;
    indeterminate?: boolean;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void;
} & BaseComponentProps;

function CheckboxComponent(props: CheckboxProps, ref: React.ForwardedRef<HTMLDivElement>) {
    const { onChange } = props;

    const [checked, setChecked] = React.useState<boolean>(props.checked ?? false);
    const id = React.useRef<string>(props.id ?? `checkbox-${v4()}`);

    React.useEffect(() => {
        setChecked(props.checked ?? false);
    }, [props.checked]);

    const handleChange = React.useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            if (props.checked === undefined) {
                setChecked(event.target.checked);
            }
            onChange && onChange(event, event.target.checked);
        },
        [setChecked, onChange, props.checked]
    );

    return (
        <BaseComponent ref={ref} disabled={props.disabled} className="flex gap-2 items-center">
            <input
                id={props.id ?? id.current}
                name={props.name}
                ref={(el) => el && (el.indeterminate = props.indeterminate ?? false)}
                type="checkbox"
                checked={checked}
                onChange={handleChange}
                className={resolveClassNames(
                    "w-4",
                    "h-4",
                    "text-blue-600",
                    "border-gray-300",
                    "rounded",
                    "focus:ring-blue-500",
                    "cursor-pointer"
                )}
            />
            {props.label && (
                <label
                    htmlFor={props.id ?? id.current}
                    className={resolveClassNames("block", "text-gray-900", "cursor-pointer")}
                >
                    {props.label}
                </label>
            )}
        </BaseComponent>
    );
}

export const Checkbox = React.forwardRef(CheckboxComponent);
