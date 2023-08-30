import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { v4 } from "uuid";

import { BaseComponent } from "../BaseComponent";
import { BaseComponentProps } from "../BaseComponent";
import { OptionalValues, withDefaults } from "../_component-utils/components";

export type RadioGroupProps<T = string | number> = {
    name?: string;
    options: {
        label: React.ReactNode;
        value: T;
        disabled?: boolean;
    }[];
    value: T;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>, value: string | number) => void;
    direction?: "horizontal" | "vertical";
} & BaseComponentProps;

const defaultProps: OptionalValues<RadioGroupProps> = {
    direction: "vertical",
};

type RadioProps = {
    name: string;
    label: React.ReactNode;
    value: string | number;
    checked: boolean;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>, value: string | number) => void;
} & BaseComponentProps;

const Radio: React.FC<RadioProps> = (props) => {
    return (
        <BaseComponent disabled={props.disabled}>
            <label className={resolveClassNames("relative", "cursor-pointer", "inline-flex", "align-middle", "gap-2")}>
                <span
                    className={resolveClassNames(
                        "rounded-full",
                        "w-5",
                        "h-5",
                        "border-2",
                        "border-solid",
                        "flex",
                        "items-center",
                        "justify-center",
                        props.checked ? "border-blue-500" : "border-gray-400"
                    )}
                >
                    <span
                        className={resolveClassNames(
                            "rounded-full",
                            props.checked ? "w-3" : "w-0",
                            props.checked ? "h-3" : "h-0",
                            "bg-blue-500",
                            "block",
                            "transition-all"
                        )}
                    />
                    <input
                        className="opacity-0 absolute w-full h-full cursor-inherit top-0 left-0 m-0 p-0 z-1"
                        type="radio"
                        name={props.name}
                        value={props.value}
                        checked={props.checked}
                        onChange={(e) => props.onChange && props.onChange(e, props.value)}
                        disabled={props.disabled}
                    />
                </span>
                {props.label}
            </label>
        </BaseComponent>
    );
};

export const RadioGroup = withDefaults<RadioGroupProps>()(defaultProps, (props) => {
    const name = React.useRef<string>(props.name || v4());
    return (
        <BaseComponent disabled={props.disabled}>
            <div
                className={resolveClassNames({
                    "opacity-30 pointer-events-none": props.disabled === true,
                })}
            >
                <span>{props.name}</span>
                <div
                    className={resolveClassNames("flex", "radio-group", "gap-4", "m-1", {
                        "flex-col": props.direction === "vertical",
                    })}
                >
                    {props.options.map((option) => (
                        <Radio
                            key={option.value}
                            name={name.current}
                            label={option.label}
                            value={option.value}
                            checked={option.value === props.value}
                            onChange={props.onChange}
                            disabled={option.disabled}
                        />
                    ))}
                </div>
            </div>
        </BaseComponent>
    );
});

RadioGroup.displayName = "RadioGroup";
