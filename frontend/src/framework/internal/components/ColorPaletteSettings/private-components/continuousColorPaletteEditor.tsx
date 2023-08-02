import React from "react";

import { CheckIcon } from "@heroicons/react/20/solid";
import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";
import { Label } from "@lib/components/Label";
import { ColorPalette, ColorStop, ContinuousColorPalette } from "@lib/utils/ColorPalette";
import { Point } from "@lib/utils/geometry";

import { isEqual } from "lodash";

import { resolveClassNames } from "../../../../../lib/components/_utils/resolveClassNames";

type ColorStopMidPointHandleProps = {
    colorStopId: string;
    parentRef: React.MutableRefObject<HTMLDivElement | null>;
    value: number;
    min: number;
    max: number;
    onChange?: (colorStopId: string, value: number) => void;
    onSelect?: () => void;
};

const ColorStopMidPointHandle: React.FC<ColorStopMidPointHandleProps> = (props) => {
    const [value, setValue] = React.useState<number>(props.value);
    const [prevValue, setPrevValue] = React.useState<number>(props.value);
    const [grabbed, setGrabbed] = React.useState<boolean>(false);
    const ref = React.useRef<HTMLDivElement>(null);

    if (props.value !== prevValue) {
        setValue(props.value);
        setPrevValue(props.value);
    }

    React.useEffect(
        function handleValueChange() {
            if (props.onChange) {
                props.onChange(props.colorStopId, value);
            }
        },
        [props.colorStopId, value, props.onChange]
    );

    React.useEffect(function handleMount() {
        let mouseDownPosition: Point | null = null;

        function handlePointerDown(e: PointerEvent) {
            mouseDownPosition = { x: e.clientX, y: e.clientY };
            setGrabbed(true);
            document.body.classList.add("cursor-grabbing");
            document.body.classList.add("select-none");

            if (props.onSelect) {
                props.onSelect();
            }
        }

        function handlePointerMove(e: PointerEvent) {
            if (!mouseDownPosition) {
                return;
            }

            if (!props.parentRef.current) {
                return;
            }

            const parentRect = props.parentRef.current.getBoundingClientRect();

            const relPos = Math.min(
                props.max,
                Math.max(props.min, Math.round(((e.clientX - parentRect.left) / parentRect.width) * 100) / 100)
            );

            setValue(relPos);
        }

        function handlePointerUp() {
            mouseDownPosition = null;
            setGrabbed(false);
            document.body.classList.remove("cursor-grabbing");
            document.body.classList.remove("select-none");
        }

        function handleBlur() {
            mouseDownPosition = null;
            setGrabbed(false);
            document.body.classList.remove("cursor-grabbing");
            document.body.classList.remove("select-none");
        }

        if (ref.current) {
            ref.current.addEventListener("pointerdown", handlePointerDown);
            window.addEventListener("pointermove", handlePointerMove);
            window.addEventListener("pointerup", handlePointerUp);
            window.addEventListener("blur", handleBlur);
        }

        return function handleUnmount() {
            if (ref.current) {
                ref.current.removeEventListener("pointerdown", handlePointerDown);
                window.removeEventListener("pointermove", handlePointerMove);
                window.removeEventListener("pointerup", handlePointerUp);
                window.removeEventListener("blur", handleBlur);
            }
        };
    }, []);

    return (
        <div
            ref={ref}
            className={resolveClassNames(
                "absolute w-2 h-2 -translate-x-1/2 transform rotate-45 border shadow border-slate-800 -bottom-1",
                {
                    "bg-black": grabbed,
                    "bg-white": !grabbed,
                    "z-50": grabbed,
                    "cursor-grab": !grabbed,
                    "cursor-grabbing": grabbed,
                }
            )}
            style={{
                left: value * 100 + "%",
            }}
        />
    );
};

enum MidPoint {
    Start,
    End,
}

type ColorStopHandleProps = {
    parentRef: React.MutableRefObject<HTMLDivElement | null>;
    colorStop: ColorStop;
    min: number;
    max: number;
    selected: boolean;
    onSelect?: (colorStop: ColorStop) => void;
    onChange?: (colorStop: ColorStop) => void;
    onDelete?: (colorStop: ColorStop) => void;
};

const ColorStopHandle: React.FC<ColorStopHandleProps> = (props) => {
    const [colorStop, setColorStop] = React.useState<ColorStop>(props.colorStop);
    const [prevColorStop, setPrevColorStop] = React.useState<ColorStop>(props.colorStop);
    const [grabbed, setGrabbed] = React.useState<boolean>(false);
    const ref = React.useRef<HTMLDivElement>(null);

    if (!isEqual(props.colorStop, prevColorStop)) {
        setColorStop(props.colorStop);
        setPrevColorStop(props.colorStop);
    }

    React.useEffect(
        function handleColorStopChange() {
            if (props.onChange) {
                props.onChange(colorStop);
            }
        },
        [colorStop, props.onChange]
    );

    React.useEffect(
        function handleMount() {
            let mouseDownPosition: Point | null = null;

            function handlePointerDown(e: PointerEvent) {
                mouseDownPosition = { x: e.clientX, y: e.clientY };
                setGrabbed(true);
                document.body.classList.add("cursor-grabbing");
                document.body.classList.add("select-none");

                if (props.onSelect) {
                    props.onSelect(colorStop);
                }
            }

            function handlePointerMove(e: PointerEvent) {
                if (!mouseDownPosition) {
                    return;
                }

                if (!props.parentRef.current) {
                    return;
                }

                if (mouseDownPosition && props.onDelete && Math.abs(mouseDownPosition.y - e.clientY) > 50) {
                    mouseDownPosition = null;
                    setGrabbed(false);
                    document.body.classList.remove("cursor-grabbing");
                    document.body.classList.remove("select-none");
                    props.onDelete(colorStop);
                    return;
                }

                const parentRect = props.parentRef.current.getBoundingClientRect();

                const relPos = Math.min(
                    props.max,
                    Math.max(props.min, Math.round(((e.clientX - parentRect.left) / parentRect.width) * 100) / 100)
                );

                setColorStop((prev) => ({
                    ...prev,
                    position: Math.max(0, Math.min(1, relPos)),
                }));
            }

            function handlePointerUp() {
                mouseDownPosition = null;
                setGrabbed(false);
                document.body.classList.remove("cursor-grabbing");
                document.body.classList.remove("select-none");
            }

            function handleBlur() {
                mouseDownPosition = null;
                setGrabbed(false);
                document.body.classList.remove("cursor-grabbing");
                document.body.classList.remove("select-none");
            }

            if (ref.current) {
                ref.current.addEventListener("pointerdown", handlePointerDown);
                window.addEventListener("pointermove", handlePointerMove);
                window.addEventListener("pointerup", handlePointerUp);
                window.addEventListener("blur", handleBlur);
            }

            return function handleUnmount() {
                if (ref.current) {
                    ref.current.removeEventListener("pointerdown", handlePointerDown);
                    window.removeEventListener("pointermove", handlePointerMove);
                    window.removeEventListener("pointerup", handlePointerUp);
                    window.removeEventListener("blur", handleBlur);
                }
            };
        },
        [props.onDelete]
    );

    return (
        <>
            <div
                ref={ref}
                className={resolveClassNames("absolute w-4 h-4 -translate-x-1/2 top-0 shadow", {
                    "cursor-grab": !grabbed,
                    "cursor-grabbing": grabbed,
                    "z-50": grabbed,
                })}
                style={{
                    left: colorStop.position * 100 + "%",
                }}
            >
                <div
                    className="absolute w-4 h-4 z-20 border border-slate-600"
                    style={{
                        backgroundColor: colorStop.hexColor,
                    }}
                />
                <div
                    className={resolveClassNames(
                        "absolute z-10 -bottom-1.5 w-[0.71rem] h-[0.71rem] left-[0.15rem] border border-slate-600 transform rotate-45 border-t-0 shadow",
                        { "bg-white": !props.selected, "bg-black": props.selected }
                    )}
                />
            </div>
        </>
    );
};

export type ContinuousColorPaletteEditorProps = {
    colorPalette: ContinuousColorPalette;
    onChange?: (colorPalette: ColorPalette) => void;
    onClose?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
};

export const ContinuousColorPaletteEditor: React.FC<ContinuousColorPaletteEditorProps> = (props) => {
    const colorPalette = React.useRef<ContinuousColorPalette>(props.colorPalette);
    const [selectedColorStopId, setSelectedColorStopId] = React.useState<string | null>(null);
    const [selectedMidPoint, setSelectedMidPoint] = React.useState<MidPoint | null>(null);
    const [_, forceRerender] = React.useReducer((x) => x + 1, 0);

    const colorStopRef = React.useRef<HTMLDivElement>(null);

    function handleSaveClick() {
        if (props.onChange) {
            props.onChange(colorPalette.current);
        }
    }

    const handleColorStopRemove = React.useCallback(function handleColorStopRemove(colorStop: ColorStop) {
        if (colorPalette.current.getColorStops().length <= 2) {
            return;
        }
        colorPalette.current.removeColorStop(colorStop.id);
        forceRerender();
    }, []);

    const handleColorStopPositionChange = React.useCallback(function handleColorStopPositionChange(
        colorStop: ColorStop
    ) {
        colorPalette.current.changeColorStopPosition(colorStop.id, colorStop.position);
        forceRerender();
    },
    []);

    const handleColorStopMidPointPositionChange = React.useCallback(function handleColorStopMidPointPositionChange(
        colorStopId: string,
        value: number
    ) {
        const colorStop = colorPalette.current.getColorStop(colorStopId);
        const nextColorStop = colorPalette.current.getNextColorStop(colorStopId);
        if (!colorStop || !nextColorStop) {
            return;
        }
        colorPalette.current.changeColorStopMidPointPosition(
            colorStopId,
            (value - colorStop.position) / (nextColorStop.position - colorStop.position)
        );
        forceRerender();
    },
    []);

    const handleColorStopSelected = React.useCallback(function handleColorStopSelected(colorStop: ColorStop) {
        setSelectedColorStopId(colorStop.id);
    }, []);

    return (
        <Dialog
            title="Edit color palette"
            open
            onClose={props.onClose}
            width={"25%"}
            actions={
                <Button startIcon={<CheckIcon className="w-4 h-4" />} onClick={handleSaveClick}>
                    Save
                </Button>
            }
        >
            <div className="flex flex-col">
                <div className="flex-grow">
                    <div ref={colorStopRef} className="relative h-6 w-full z-[1]">
                        {colorPalette.current.getColorStops().map((stop) => {
                            const prev = colorPalette.current.getPreviousColorStop(stop.id);
                            const next = colorPalette.current.getNextColorStop(stop.id);
                            return (
                                <React.Fragment key={stop.id}>
                                    <ColorStopHandle
                                        colorStop={stop}
                                        min={prev?.position || 0}
                                        max={next?.position || 1}
                                        selected={selectedColorStopId === stop.id}
                                        parentRef={colorStopRef}
                                        onChange={handleColorStopPositionChange}
                                        onDelete={handleColorStopRemove}
                                        onSelect={handleColorStopSelected}
                                    />
                                    {selectedColorStopId === stop.id && (
                                        <>
                                            {prev && prev.position !== stop.position && (
                                                <ColorStopMidPointHandle
                                                    colorStopId={prev.id}
                                                    parentRef={colorStopRef}
                                                    value={
                                                        prev.position +
                                                        (stop.position - prev.position) * prev.midPointPosition
                                                    }
                                                    min={prev.position}
                                                    max={stop.position}
                                                    onChange={handleColorStopMidPointPositionChange}
                                                    onSelect={() => {
                                                        setSelectedMidPoint(MidPoint.Start);
                                                    }}
                                                />
                                            )}
                                            {next && next.position !== stop.position && (
                                                <ColorStopMidPointHandle
                                                    colorStopId={stop.id}
                                                    parentRef={colorStopRef}
                                                    value={
                                                        stop.position +
                                                        (next.position - stop.position) * stop.midPointPosition
                                                    }
                                                    min={stop.position}
                                                    max={next.position}
                                                    onChange={handleColorStopMidPointPositionChange}
                                                    onSelect={() => {
                                                        setSelectedMidPoint(MidPoint.End);
                                                    }}
                                                />
                                            )}
                                        </>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                    <div className="h-12 w-full" style={{ backgroundImage: colorPalette.current.getGradient() }}></div>
                    <div className={resolveClassNames("flex", { "opacity-40": !selectedColorStopId })}>
                        <div className="p-4">
                            <Label text="Color">
                                <input
                                    type="color"
                                    value={colorPalette.current.getColorStop(selectedColorStopId || "")?.hexColor}
                                    onChange={(e) => {
                                        if (selectedColorStopId) {
                                            colorPalette.current.changeColorStopColor(
                                                selectedColorStopId,
                                                e.target.value
                                            );
                                            forceRerender();
                                        }
                                    }}
                                    className="rounded border border-slate-400 outline-none p-1 h-8 cursor-pointer"
                                    disabled={!selectedColorStopId}
                                />
                            </Label>
                        </div>
                        <div className="p-4 flex-grow">
                            <Label text="Location">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        step={1}
                                        value={Math.round(
                                            (colorPalette.current.getColorStop(selectedColorStopId || "")?.position ||
                                                0) * 100
                                        )}
                                        onChange={(e) => {
                                            if (selectedColorStopId) {
                                                colorPalette.current.changeColorStopPosition(
                                                    selectedColorStopId,
                                                    Number(e.target.value) / 100
                                                );
                                                forceRerender();
                                            }
                                        }}
                                        className="rounded border border-slate-400 outline-none p-1 h-8 w-full"
                                        disabled={!selectedColorStopId}
                                    />
                                    %
                                </div>
                            </Label>
                        </div>
                    </div>
                </div>
            </div>
        </Dialog>
    );
};
