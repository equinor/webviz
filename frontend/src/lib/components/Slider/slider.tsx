import React from "react";
import ReactDOM from "react-dom";

import { Point } from "@lib/utils/geometry";
import { Slider as SliderUnstyled, SliderProps as SliderUnstyledProps } from "@mui/base";

import { BaseComponent } from "../_BaseComponent";
import { resolveClassNames } from "../_utils/resolveClassNames";

export type SliderProps = {
    valueLabelDisplay?: "on" | "auto" | "off";
} & SliderUnstyledProps;

export const Slider = React.forwardRef((props: SliderProps, ref: React.ForwardedRef<HTMLDivElement>) => {
    const { valueLabelDisplay, value: propsValue, max, valueLabelFormat, orientation, ...rest } = props;

    const [value, setValue] = React.useState<number | number[]>(propsValue ?? 0);
    const [currentlyActiveThumb, setCurrentlyActiveThumb] = React.useState<number>(0);
    const [index, setIndex] = React.useState<number>(0);
    const [prevValue, setPrevValue] = React.useState<number | number[]>(propsValue ?? 0);
    const [valueLabelVisible, setValueLabelVisible] = React.useState<boolean>(false);
    const [valueLabelPosition, setValueLabelPosition] = React.useState<Point>({ x: 0, y: 0 });

    const divRef = React.useRef<HTMLDivElement>(null);
    const valueLabelRef = React.useRef<HTMLDivElement>(null);

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

        const handlePointerDown = () => {
            pointerPressed = true;
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
        props.onChange?.(event, value, activeThumb);

        if (divRef.current) {
            const elements = divRef.current.getElementsByClassName("MuiSlider-thumb");
            if (elements.length >= 1) {
                const thumb = elements[activeThumb];
                if (thumb) {
                    setValueLabelPosition({
                        x: thumb.getBoundingClientRect().left + thumb.getBoundingClientRect().width / 2 + 1,
                        y: thumb.getBoundingClientRect().top + thumb.getBoundingClientRect().height / 2 + 1,
                    });
                }
            }
        }
    }

    return (
        <BaseComponent disabled={props.disabled}>
            <div ref={divRef} className="mt-2 mb-2 w-full h-full">
                <SliderUnstyled
                    {...rest}
                    orientation={orientation ?? "horizontal"}
                    max={max}
                    onChange={handleValueChanged}
                    value={value}
                    ref={ref}
                    slotProps={{
                        root: {
                            className: resolveClassNames(
                                orientation === "horizontal" ? "w-full" : "w-3",
                                orientation === "horizontal" ? "h-3" : "h-full",
                                "cursor-pointer",
                                "touch-action-none",
                                "inline-block",
                                "relative",
                                "hover:opacity-100",
                                "relative",
                                "px-4"
                            ),
                        },
                        rail: {
                            className: resolveClassNames(
                                "block",
                                orientation === "horizontal" ? "w-full" : "w-1",
                                orientation === "horizontal" ? "h-1" : "h-full",
                                "bg-gray-300",
                                "rounded",
                                "opacity-40",
                                orientation === "horizontal" ? "left-0" : "top-0"
                            ),
                        },
                        track: {
                            className: resolveClassNames(
                                "block",
                                orientation === "horizontal" ? "h-1" : "w-1",
                                "bg-blue-600",
                                "rounded",
                                "absolute",
                                orientation === "horizontal" ? "top-0" : "left-0"
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
                                "shadow-sm",
                                "rounded-full",
                                "transform",
                                "ml-0.5",
                                "mt-0.5",
                                "-translate-x-1/2",
                                "translate-y-1/2",
                                orientation === "horizontal" ? "top-0" : "left-0",
                                "cursor-pointer",
                                "outline-none",
                                "focus:outline-none",
                                "hover:shadow-md",
                                "active:shadow-lg",
                                "after:absolute",
                                "after:rounded-full",
                                "after:bg-transparent",
                                "after:opacity-30",
                                "after:shadow-sm",
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
                        mark: (args) => {
                            return {
                                className: resolveClassNames(
                                    "absolute",
                                    "w-1",
                                    "h-1",
                                    "rounded-full",
                                    "bg-slate-600",
                                    "opacity-40",
                                    orientation === "horizontal" ? "top-0.5" : "",
                                    "transform",
                                    "-translate-y-1/2",
                                    "active:bg-white"
                                ),
                            };
                        },
                    }}
                />
            </div>
            {valueLabelDisplay !== "off" &&
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
                            {valueLabelFormat
                                ? typeof valueLabelFormat === "function"
                                    ? valueLabelFormat(
                                          Array.isArray(value) ? value[currentlyActiveThumb] : value,
                                          index
                                      )
                                    : valueLabelFormat
                                : Array.isArray(value)
                                ? value[currentlyActiveThumb]
                                : value}
                        </div>
                    </div>,
                    document.body
                )}
        </BaseComponent>
    );
});

Slider.displayName = "Slider";
