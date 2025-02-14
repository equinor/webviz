import React from "react";

import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { convertRemToPixels } from "@lib/utils/screenUnitConversions";
import {
    Popper as PopperUnstyled,
    Slider as SliderUnstyled,
    SliderProps as SliderUnstyledProps,
    SliderValueLabelSlotProps,
} from "@mui/base";

import { BaseComponent } from "../BaseComponent";

type SliderValueLabelProps = {
    visible: boolean;
} & SliderValueLabelSlotProps;

function SliderValueLabel(props: SliderValueLabelProps) {
    const anchorRef = React.useRef<HTMLDivElement | null>(null);

    return (
        <>
            <PopperUnstyled
                id="slider-popper"
                className="z-50"
                open={props.visible}
                anchorEl={() => anchorRef.current!}
                placement="top"
                popperOptions={{ modifiers: [{ name: "offset", options: { offset: [0, 8] } }] }}
            >
                <span
                    className={resolveClassNames(
                        "pointer-events-none",
                        "inline-block",
                        "rounded",
                        "bg-blue-600",
                        "text-white",
                        "p-2",
                        "h-6",
                        "text-xs",
                        "font-bold",
                        "leading-none",
                        "whitespace-nowrap",
                        "before:absolute",
                        "before:-bottom-2",
                        "before:left-1/2",
                        "before:transform",
                        "before:-translate-x-1/2",
                        "before:-translate-y-1/2",
                        "before:w-2",
                        "before:h-2",
                        "before:bg-blue-600",
                        "before:rotate-45"
                    )}
                >
                    {props.children}
                </span>
            </PopperUnstyled>
            <div ref={anchorRef} />
        </>
    );
}

export type SliderProps = {
    valueLabelDisplay?: "auto" | "off";
    valueLabelFormat?: string | ((value: number) => string);
    debounceTimeMs?: number;
} & Omit<SliderUnstyledProps, "valueLabelFormat">;

function SliderComponent(props: SliderProps, ref: React.ForwardedRef<HTMLDivElement>) {
    const {
        valueLabelDisplay,
        value: propsValue,
        valueLabelFormat,
        scale,
        max,
        min,
        orientation,
        track,
        debounceTimeMs,
        ...rest
    } = props;
    const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const [value, setValue] = React.useState<number | number[]>(propsValue ?? 0);
    const [prevValue, setPrevValue] = React.useState<number | number[]>(propsValue ?? 0);
    const [valueLabelVisible, setValueLabelVisible] = React.useState<boolean>(false);

    const divRef = React.useRef<HTMLDivElement>(null);
    React.useImperativeHandle<HTMLDivElement | null, HTMLDivElement | null>(ref, () => divRef.current);

    const sliderRect = useElementBoundingRect(divRef);

    if (propsValue !== undefined && propsValue !== prevValue) {
        setValue(propsValue);
        setPrevValue(propsValue);
    }

    React.useEffect(function handleMount() {
        const divRefCurrent = divRef.current;
        let pointerPressed = false;
        let hovered = false;

        const handlePointerOver = () => {
            setValueLabelVisible(true);
            hovered = true;
        };

        const handlePointerOut = () => {
            hovered = false;
            if (pointerPressed) {
                return;
            }
            setValueLabelVisible(false);
        };

        const handlePointerDown = () => {
            pointerPressed = true;
            if (divRef.current) {
                document.addEventListener("pointerup", handlePointerUp);
            }
        };

        const handlePointerUp = () => {
            pointerPressed = false;
            if (hovered) {
                return;
            }
            setValueLabelVisible(false);
            document.removeEventListener("pointerup", handlePointerUp);
        };

        if (divRefCurrent) {
            divRefCurrent.addEventListener("pointerover", handlePointerOver);
            divRefCurrent.addEventListener("pointerout", handlePointerOut);
            divRefCurrent.addEventListener("pointerdown", handlePointerDown);
        }
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            if (divRefCurrent) {
                divRefCurrent.removeEventListener("pointerover", handlePointerOver);
                divRefCurrent.removeEventListener("pointerout", handlePointerOut);
                divRefCurrent.removeEventListener("pointerdown", handlePointerDown);
                document.removeEventListener("pointerup", handlePointerUp);
            }
        };
    }, []);

    function handleValueChanged(event: Event, value: number | number[], activeThumb: number) {
        setValue(value);

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        if (!props.debounceTimeMs) {
            props.onChange?.(event, value, activeThumb);
            return;
        }

        debounceTimerRef.current = setTimeout(() => {
            debounceTimerRef.current = null;
            props.onChange?.(event, value, activeThumb);
        }, debounceTimeMs);
    }

    React.useEffect(function handleMount() {
        return function handleUnmount() {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    // This function converts the slider value to a content for label
    const formatLabelValue = React.useCallback(
        function formatLabelValue(labelValue: number): React.ReactNode {
            const adjustedValue = scale ? scale(labelValue) : labelValue;
            if (valueLabelFormat) {
                if (typeof valueLabelFormat === "function") {
                    return valueLabelFormat(adjustedValue);
                }
                return valueLabelFormat;
            }

            return adjustedValue.toString();
        },
        [scale, valueLabelFormat]
    );

    return (
        <BaseComponent disabled={props.disabled} ref={divRef} className="mt-2 mb-2 flex justify-center">
            <SliderUnstyled
                {...rest}
                scale={props.scale}
                orientation={orientation ?? "horizontal"}
                max={max}
                min={min}
                onChange={handleValueChanged}
                value={value}
                ref={ref}
                valueLabelFormat={(value) => {
                    return formatLabelValue(value);
                }}
                slots={{
                    valueLabel: SliderValueLabel,
                }}
                slotProps={{
                    valueLabel: {
                        visible: valueLabelDisplay === "auto" && valueLabelVisible,
                    },
                    root: {
                        className: resolveClassNames(
                            orientation === "vertical" ? "w-3" : "w-full mx-3",
                            orientation === "vertical" ? "h-full my-3" : "h-3",
                            "cursor-pointer",
                            "touch-action-none",
                            "inline-block",
                            "relative",
                            orientation === "vertical" ? "px-4" : ""
                        ),
                    },
                    rail: {
                        className: resolveClassNames(
                            "block",
                            orientation === "vertical" ? "w-1" : "w-full",
                            orientation === "vertical" ? "h-full" : "h-1",
                            track === "inverted" ? "bg-blue-600" : "bg-blue-200",
                            "rounded",
                            orientation === "vertical" ? "top-0" : "left-0",
                            "transform",
                            orientation === "vertical" ? "-translate-y-1" : "translate-y-1"
                        ),
                    },
                    track: {
                        className: resolveClassNames(
                            "block",
                            orientation === "vertical" ? "w-1" : "h-1",
                            track !== "inverted" ? "bg-blue-600" : "bg-blue-200",
                            "rounded",
                            "absolute",
                            "transform",
                            orientation === "vertical" ? "translate-x-1/2" : "",
                            orientation === "vertical" ? "-translate-y-1" : "",
                            orientation === "vertical" ? "-ml-0.5" : "",
                            track === false ? "hidden" : ""
                        ),
                    },
                    thumb: {
                        className: resolveClassNames(
                            "absolute",
                            "box-content",
                            "w-5",
                            "h-5",
                            "block",
                            "bg-blue-600",
                            "z-5",
                            "shadow-sm",
                            "rounded-full",
                            "transform",
                            orientation === "vertical" ? "translate-x-1/2" : "-translate-x-1/2",
                            orientation === "vertical" ? "translate-y-1.5" : "-translate-y-1",
                            orientation === "vertical" ? "left-0" : "top-0",
                            orientation === "vertical" ? "-ml-0.5" : "ml-0.5",
                            "cursor-pointer",
                            "outline-none",
                            "focus:outline-none",
                            "hover:shadow-md",
                            "active:shadow-lg",
                            "after:absolute",
                            "after:rounded-full",
                            "after:w-7",
                            "after:h-7",
                            "after:inset-0",
                            "after:-left-1",
                            "after:-top-1",
                            "after:bg-blue-600",
                            "after:transition-all",
                            "after:duration-100",
                            "after:ease-in-out",
                            "after:transform",
                            "after:scale-0",
                            "after:opacity-0",
                            "after:hover:opacity-10",
                            "after:hover:scale-100",
                            "after:z-50",
                            "after:active:scale-110",
                            "after:active:opacity-15",
                            "after:active:-left-[0.4em]",
                            "after:active:-top-[0.4em]",
                            "after:active:w-8",
                            "after:active:h-8"
                        ),
                    },
                    mark: {
                        className: resolveClassNames(
                            "absolute",
                            "w-2",
                            "h-2",
                            "-ml-0.5",
                            "-mt-0.5",
                            "opacity-80",
                            "transform",
                            orientation === "vertical" ? "-translate-y-0" : "",
                            "z-4",
                            {
                                "border-2 bg-blue-600 border-white":
                                    Array.isArray(props.marks) &&
                                    props.marks.length <
                                        ((orientation === "vertical" ? sliderRect.height : sliderRect.width) -
                                            convertRemToPixels(6 / 4)) /
                                            8,
                            }
                        ),
                    },
                }}
            />
        </BaseComponent>
    );
}

export const Slider = React.forwardRef(SliderComponent);
