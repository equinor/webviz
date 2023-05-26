import React from "react";

import { SliderUnstyled, SliderUnstyledProps } from "@mui/base";

import { Input } from "../Input";
import { BaseComponent } from "../_BaseComponent";
import { resolveClassNames } from "../_utils/resolveClassNames";

export type SliderProps = {
    displayValue?: boolean;
} & SliderUnstyledProps;

function keepValueInRange(value: number, min: number, max: number): number {
    if (value < min) {
        return min;
    }
    if (value > max) {
        return max;
    }
    return value;
}

export const Slider = React.forwardRef((props: SliderProps, ref: React.ForwardedRef<HTMLDivElement>) => {
    const { displayValue, value: propsValue, ...rest } = props;

    const [value, setValue] = React.useState<number | number[]>(propsValue ?? 0);
    const [prevValue, setPrevValue] = React.useState<number | number[]>(propsValue ?? 0);

    if (propsValue !== undefined && propsValue !== prevValue) {
        setValue(propsValue);
        setPrevValue(propsValue);
    }

    const handleValueChanged = (event: Event, value: number | number[], activeThumb: number) => {
        setValue(value);
        props.onChange?.(event, value, activeThumb);
    };

    const handleStartInputValueChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (Array.isArray(value)) {
            const newValue = [keepValueInRange(Number(event.target.value), props.min ?? 0, props.max ?? 100), value[1]];
            setValue(newValue);
            props.onChange?.(event.nativeEvent, newValue, 0);
        }
    };

    const handleEndInputValueChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (Array.isArray(value)) {
            const newValue = [value[0], keepValueInRange(Number(event.target.value), props.min ?? 0, props.max ?? 100)];
            setValue(newValue);
            props.onChange?.(event.nativeEvent, newValue, 1);
            return;
        }
        const newValue = keepValueInRange(Number(event.target.value), props.min ?? 0, props.max ?? 100);
        setValue(newValue);
        props.onChange?.(event.nativeEvent, newValue, 0);
    };

    return (
        <BaseComponent disabled={props.disabled}>
            <div className="flex flex-row gap-4 items-center">
                {props.displayValue && Array.isArray(value) && (
                    <Input
                        type="number"
                        style={{
                            width: Math.floor(Math.log10((props.max ?? 100) / 10)) + 2 + "rem",
                        }}
                        value={value[0]}
                        className="w-8"
                        onChange={handleStartInputValueChanged}
                    />
                )}
                <SliderUnstyled
                    {...rest}
                    onChange={handleValueChanged}
                    value={value}
                    ref={ref}
                    slotProps={{
                        root: {
                            className: resolveClassNames(
                                "w-full",
                                "h-3",
                                "pl-4",
                                "cursor-pointer",
                                "touch-action-none",
                                "inline-block",
                                "relative",
                                "hover:opacity-100"
                            ),
                        },

                        rail: {
                            className: resolveClassNames(
                                "block",
                                "w-full",
                                "h-1",
                                "bg-gray-300",
                                "rounded",
                                "opacity-40"
                            ),
                        },
                        track: {
                            className: resolveClassNames(
                                "block",
                                "h-1",
                                "bg-indigo-600",
                                "rounded",
                                "absolute",
                                "top-0",
                                "left-0"
                            ),
                        },
                        thumb: {
                            className: resolveClassNames(
                                "absolute",
                                "w-5",
                                "h-5",
                                "-ml-2",
                                "-mt-2",
                                "box-border",
                                "block",
                                "bg-white",
                                "shadow-sm",
                                "rounded-full",
                                "top-0",
                                "left-0",
                                "cursor-pointer",
                                "border-2",
                                "border-gray-300",
                                "outline-none",
                                "focus:outline-none",
                                "hover:shadow-md",
                                "active:shadow-lg"
                            ),
                        },
                    }}
                />
                {displayValue && (
                    <Input
                        type="number"
                        value={Array.isArray(value) ? value[1] : value}
                        style={{
                            width: Math.floor(Math.log10((props.max ?? 100) / 10)) + 2 + "rem",
                        }}
                        onChange={handleEndInputValueChanged}
                    />
                )}
            </div>
        </BaseComponent>
    );
});

Slider.displayName = "Slider";
