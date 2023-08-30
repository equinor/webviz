import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { v4 } from "uuid";

import { BaseComponent, BaseComponentProps } from "../BaseComponent";

export type CheckboxProps = {
    id?: string;
    label?: string;
    checked?: boolean;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void;
} & BaseComponentProps;

export const Checkbox: React.FC<CheckboxProps> = (props) => {
    const [checked, setChecked] = React.useState<boolean>(props.checked ?? false);
    const id = React.useRef<string>(props.id ?? `checkbox-${v4()}`);

    React.useEffect(() => {
        setChecked(props.checked ?? false);
    }, [props.checked]);

    const handleChange = React.useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            setChecked(event.target.checked);
            props.onChange && props.onChange(event, event.target.checked);
        },
        [setChecked, props.onChange]
    );

    return (
        <BaseComponent disabled={props.disabled}>
            <div className="flex gap-2 items-center">
                <input
                    id={props.id ?? id.current}
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
                        className={resolveClassNames("block", "text-sm", "text-gray-900", "cursor-pointer")}
                    >
                        {props.label}
                    </label>
                )}
            </div>
        </BaseComponent>
    );
};

Checkbox.displayName = "Checkbox";
