import React from "react";
import ReactDOM from "react-dom";

import { Point } from "@lib/utils/geometry";
import { Slider as SliderUnstyled, SliderProps as SliderUnstyledProps } from "@mui/base";

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
        if (divRef.current) {
            const elements = divRef.current.getElementsByClassName("MuiSlider-thumb");
            if (elements.length === 1) {
                const thumb = elements[0];

                const handlePointerOver = () => {
                    setValueLabelVisible(true);
                    hovered = true;
                    if (divRef.current) {
                        const elements = divRef.current.getElementsByClassName("MuiSlider-thumb");
                        if (elements.length === 1) {
                            const thumb = elements[0];
                            setValueLabelPosition({
                                x: thumb.getBoundingClientRect().left + thumb.getBoundingClientRect().width / 2 + 1,
                                y: thumb.getBoundingClientRect().top + thumb.getBoundingClientRect().height / 2 + 1,
                            });
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

                thumb.addEventListener("pointerover", handlePointerOver);
                thumb.addEventListener("pointerout", handlePointerOut);
                thumb.addEventListener("pointerdown", handlePointerDown);
                document.addEventListener("pointerup", handlePointerUp);
                return () => {
                    thumb.removeEventListener("pointerover", handlePointerOver);
                    thumb.removeEventListener("pointerout", handlePointerOut);
                    thumb.removeEventListener("pointerdown", handlePointerDown);
                    document.removeEventListener("pointerup", handlePointerUp);
                };
            }
        }
    }, []);

    function handleValueChanged(event: Event, value: number | number[], activeThumb: number) {
        setValue(value);
        props.onChange?.(event, value, activeThumb);

        if (divRef.current) {
            const elements = divRef.current.getElementsByClassName("MuiSlider-thumb");
            if (elements.length === 1) {
                const thumb = elements[0];
                setValueLabelPosition({
                    x: thumb.getBoundingClientRect().left + thumb.getBoundingClientRect().width / 2 + 1,
                    y: thumb.getBoundingClientRect().top + thumb.getBoundingClientRect().height / 2 + 1,
                });
            }
        }
    }

    return (
        <BaseComponent disabled={props.disabled}>
            <div ref={divRef} className="mt-2 mb-2">
                <SliderUnstyled
                    {...rest}
                    max={max}
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
            </div>
            {displayValue &&
                ReactDOM.createPortal(
                    <div
                        className="absolute flex justify-center w-40 -ml-20 h-4 -mt-4 pointer-events-none z-40"
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
                                "-top-2",
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
                                    hidden: !valueLabelVisible,
                                }
                            )}
                        >
                            {value}
                        </div>
                    </div>,
                    document.body
                )}
        </BaseComponent>
    );
});

Slider.displayName = "Slider";
