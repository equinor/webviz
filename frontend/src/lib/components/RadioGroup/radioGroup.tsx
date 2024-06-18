import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { v4 } from "uuid";

import { BaseComponent } from "../BaseComponent";
import { BaseComponentProps } from "../BaseComponent";

export type RadioProps<T extends string | number> = {
    name: string;
    label: React.ReactNode;
    value: T;
    checked: boolean;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>, value: T) => void;
} & BaseComponentProps;

export function Radio<T extends string | number>(props: RadioProps<T>): JSX.Element {
    return (
        <BaseComponent disabled={props.disabled}>
            <label className="relative inline-flex align-middle gap-2 items-center group">
                <span
                    className={resolveClassNames(
                        "rounded-full",
                        "w-4 max-w-4 min-w-[1rem]",
                        "h-4 max-h-4 min-h-[1rem]",
                        "border-2",
                        "border-solid",
                        "flex",
                        "items-center",
                        "justify-center",
                        props.checked ? "border-blue-500" : "border-gray-400 group-hover:border-blue-500"
                    )}
                >
                    <span
                        className={resolveClassNames(
                            "rounded-full",
                            props.checked ? "w-2" : "w-0",
                            props.checked ? "h-2" : "h-0",
                            "bg-blue-500",
                            "block",
                            "transition-all"
                        )}
                    />
                    <input
                        className="opacity-0 absolute w-full h-full cursor-inherit top-0 left-0 m-0 p-0 z-1 cursor-pointer"
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
}

export type RadioGroupOption<T> = {
    label: React.ReactNode;
    value: T;
    disabled?: boolean;
};

export type RadioGroupProps<T extends string | number> = {
    name?: string;
    options: RadioGroupOption<T>[];
    value: T;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>, value: T) => void;
    direction?: "horizontal" | "vertical";
} & BaseComponentProps;

export function RadioGroup<T extends string | number>(props: RadioGroupProps<T>): JSX.Element {
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
                    className={resolveClassNames("flex", "radio-group", "gap-3", {
                        "flex-col": props.direction !== "horizontal",
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
}
