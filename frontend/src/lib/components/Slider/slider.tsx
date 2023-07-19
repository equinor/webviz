import React from "react";

import { Slider as SliderUnstyled, SliderProps as SliderUnstyledProps } from "@mui/base";

import { Input } from "../Input";
import { BaseComponent } from "../_BaseComponent";
import { resolveClassNames } from "../_utils/resolveClassNames";

export type SliderProps = {
    displayValue?: boolean;
} & SliderUnstyledProps;

export const Slider = React.forwardRef((props: SliderProps, ref: React.ForwardedRef<HTMLDivElement>) => {
    const { displayValue, value: propsValue, max, ...rest } = props;

    const [value, setValue] = React.useState<number | number[]>(propsValue ?? 0);
    const [prevValue, setPrevValue] = React.useState<number | number[]>(propsValue ?? 0);
    const [valueLabelVisible, setValueLabelVisible] = React.useState<boolean>(false);

    if (propsValue !== undefined && propsValue !== prevValue) {
        setValue(propsValue);
        setPrevValue(propsValue);
    }

    const handleValueChanged = (event: Event, value: number | number[], activeThumb: number) => {
        setValue(value);
        props.onChange?.(event, value, activeThumb);
    };

    return (
        <BaseComponent disabled={props.disabled}>
            <div className="relative">
                <SliderUnstyled
                    {...rest}
                    max={max}
                    onChange={handleValueChanged}
                    onPointerEnter={() => setValueLabelVisible(true)}
                    onPointerLeave={() => setValueLabelVisible(false)}
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
                                "hover:opacity-100",
                                "relative"
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
                    <div
                        className={resolveClassNames(
                            "absolute",
                            "rounded",
                            "bg-blue-600",
                            "text-white",
                            "p-2",
                            "text-xs",
                            "font-bold",
                            "leading-none",
                            "transform",
                            "-translate-x-1/2",
                            "-translate-y-full",
                            "transition-opacity",
                            "pointer-events-none",
                            "top-0",
                            {
                                hidden: !valueLabelVisible,
                            }
                        )}
                        style={{ left: `${((value as number) / (max ?? 100)) * 100}%` }}
                    >
                        {value}
                    </div>
                )}
            </div>
        </BaseComponent>
    );
});

Slider.displayName = "Slider";
