import React from "react";
import ReactDOM from "react-dom";

import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { Point } from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Slider as SliderUnstyled, SliderProps as SliderUnstyledProps } from "@mui/base";

import { BaseComponent } from "../BaseComponent";

export type SliderProps = {
    valueLabelDisplay?: "auto" | "off";
    valueLabelFormat?: string | ((value: number) => React.ReactNode);
} & Omit<SliderUnstyledProps, "valueLabelFormat">;

export const Slider = React.forwardRef((props: SliderProps, ref: React.ForwardedRef<HTMLDivElement>) => {
    const { valueLabelDisplay, value: propsValue, max, min, valueLabelFormat, orientation, track, ...rest } = props;

    const [value, setValue] = React.useState<number | number[]>(propsValue ?? 0);
    const [currentlyActiveThumb, setCurrentlyActiveThumb] = React.useState<number>(0);
    const [prevValue, setPrevValue] = React.useState<number | number[]>(propsValue ?? 0);
    const [valueLabelVisible, setValueLabelVisible] = React.useState<boolean>(false);
    const [valueLabelPosition, setValueLabelPosition] = React.useState<Point>({ x: 0, y: 0 });

    const divRef = React.useRef<HTMLDivElement>(null);
    const valueLabelRef = React.useRef<HTMLDivElement>(null);

    const sliderRect = useElementBoundingRect(divRef);

    if (propsValue !== undefined && propsValue !== prevValue) {
        setValue(propsValue);
        setPrevValue(propsValue);
    }

    React.useEffect(function handleMount() {
        let pointerPressed = false;
        let hovered = false;

        const handlePointerOver = (e: PointerEvent) => {
            setValueLabelVisible(true);
            hovered = true;
            if (divRef.current) {
                const elements = divRef.current.getElementsByClassName("MuiSlider-thumb");
                if (elements.length >= 1) {
                    const activeThumb = Array.from(elements).findIndex(
                        (element) =>
                            element ===
                                document
                                    .elementsFromPoint(e.clientX, e.clientY)
                                    .filter((el) => el.classList.contains("MuiSlider-thumb"))[0] ??
                            elements[0] ??
                            elements.item(0)
                    );
                    if (activeThumb >= 0) {
                        setCurrentlyActiveThumb(activeThumb);
                    }
                    const thumb = elements[activeThumb];
                    if (thumb) {
                        setValueLabelPosition({
                            x: thumb.getBoundingClientRect().left + thumb.getBoundingClientRect().width / 2 + 1,
                            y: thumb.getBoundingClientRect().top + thumb.getBoundingClientRect().height / 2 + 1,
                        });
                    }
                }
            }
        };

        const handlePointerOut = () => {
            hovered = false;
            if (pointerPressed) {
                return;
            }
            setValueLabelVisible(false);
        };

        const handlePointerDown = (e: PointerEvent) => {
            pointerPressed = true;

            if (divRef.current) {
                const elements = divRef.current.getElementsByClassName("MuiSlider-thumb");
                if (elements.length >= 1) {
                    const activeThumb = Array.from(elements).findIndex(
                        (element) =>
                            element ===
                                document
                                    .elementsFromPoint(e.clientX, e.clientY)
                                    .filter((el) => el.classList.contains("MuiSlider-thumb"))[0] ??
                            elements[0] ??
                            elements.item(0)
                    );
                    if (activeThumb >= 0) {
                        setCurrentlyActiveThumb(activeThumb);
                    }
                    const thumb = elements[activeThumb];
                    if (thumb) {
                        setValueLabelPosition({
                            x: thumb.getBoundingClientRect().left + thumb.getBoundingClientRect().width / 2 + 1,
                            y: thumb.getBoundingClientRect().top + thumb.getBoundingClientRect().height / 2 + 1,
                        });
                    }
                }
            }
        };

        const handlePointerUp = () => {
            pointerPressed = false;
            if (hovered) {
                return;
            }
            setValueLabelVisible(false);
        };

        if (divRef.current) {
            divRef.current.addEventListener("pointerover", handlePointerOver);
            divRef.current.addEventListener("pointerout", handlePointerOut);
            divRef.current.addEventListener("pointerdown", handlePointerDown);
            document.addEventListener("pointerup", handlePointerUp);
        }
        return () => {
            if (divRef.current) {
                divRef.current.removeEventListener("pointerover", handlePointerOver);
                divRef.current.removeEventListener("pointerout", handlePointerOut);
                divRef.current.removeEventListener("pointerdown", handlePointerDown);
                document.removeEventListener("pointerup", handlePointerUp);
            }
        };
    }, []);

    function handleValueChanged(event: Event, value: number | number[], activeThumb: number) {
        setValue(value);
        setCurrentlyActiveThumb(activeThumb);

        const activeThumbValue = Array.isArray(value) ? value[activeThumb] : value;
        const range = (max ?? 100) - (min ?? 0);
        setValueLabelPosition({
            x:
                (orientation === "vertical"
                    ? sliderRect.width / 2
                    : ((activeThumbValue - (min ?? 0)) / range) * sliderRect.width) +
                sliderRect.left +
                3,
            y:
                (orientation === "vertical"
                    ? sliderRect.height * (1 - (activeThumbValue - (min ?? 0)) / range) - 4
                    : sliderRect.height / 2) +
                sliderRect.top +
                1,
        });
        props.onChange?.(event, value, activeThumb);
    }

    function makeLabel(): React.ReactNode {
        const currentValue = Array.isArray(value) ? value[currentlyActiveThumb] : value;
        const adjustedValue = props.scale ? props.scale(currentValue) : currentValue;

        if (valueLabelFormat) {
            if (typeof valueLabelFormat === "function") {
                return valueLabelFormat(adjustedValue);
            }
            return valueLabelFormat;
        }

        return adjustedValue;
    }

    return (
        <BaseComponent disabled={props.disabled}>
            <div ref={divRef} className="mt-2 mb-2 flex justify-center">
                <SliderUnstyled
                    {...rest}
                    scale={props.scale}
                    orientation={orientation ?? "horizontal"}
                    max={max}
                    min={min}
                    onChange={handleValueChanged}
                    value={value}
                    ref={ref}
                    slotProps={{
                        root: {
                            className: resolveClassNames(
                                orientation === "vertical" ? "w-3" : "w-full",
                                orientation === "vertical" ? "h-full" : "h-3",
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
                                "z-50",
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
                                "bg-blue-600",
                                "border-2",
                                "opacity-80",
                                "border-white",
                                "transform",
                                orientation === "vertical" ? "-translate-y-0" : "",
                                "z-40"
                            ),
                        },
                    }}
                />
            </div>
            {valueLabelDisplay !== undefined &&
                valueLabelDisplay !== "off" &&
                ReactDOM.createPortal(
                    <div
                        className="absolute flex justify-center w-40 -ml-20 h-4 -mt-5 pointer-events-none z-50"
                        ref={valueLabelRef}
                        style={{ left: valueLabelPosition.x, top: valueLabelPosition.y }}
                    >
                        <div
                            className={resolveClassNames(
                                "rounded",
                                "bg-blue-600",
                                "text-white",
                                "p-2",
                                "text-xs",
                                "font-bold",
                                "leading-none",
                                "transform",
                                "-ml-0.5",
                                "-translate-y-full",
                                "transition-opacity",
                                "pointer-events-none",
                                "h-6",
                                "before:absolute",
                                "before:-bottom-5",
                                "before:left-1/2",
                                "before:transform",
                                "before:-translate-x-1/2",
                                "before:-translate-y-full",
                                "before:w-4",
                                "before:h-4",
                                "before:bg-blue-600",
                                "before:rotate-45",
                                "before:-z-10",
                                {
                                    hidden: !valueLabelVisible && valueLabelDisplay === "auto",
                                }
                            )}
                        >
                            {makeLabel()}
                        </div>
                    </div>,
                    document.body
                )}
        </BaseComponent>
    );
});

Slider.displayName = "Slider";
