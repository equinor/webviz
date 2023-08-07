import React from "react";

import { CheckIcon, MinusIcon, PlusIcon, TrashIcon } from "@heroicons/react/20/solid";
import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { ColorPalette, ColorStop, ContinuousColorPalette } from "@lib/utils/ColorPalette";
import { Point, rectContainsPoint } from "@lib/utils/geometry";

import { isEqual } from "lodash";

import { resolveClassNames } from "../../../../../lib/components/_utils/resolveClassNames";

type ColorStopMidPointHandleProps = {
    colorStopId: string;
    parentRef: React.MutableRefObject<HTMLDivElement | null>;
    value: number;
    min: number;
    max: number;
    selected: boolean;
    onChange?: (colorStopId: string, value: number) => void;
    onSelect?: (midPointType: MidPoint) => void;
    onGrabChange?: (grabbed: boolean) => void;
    midPointType: MidPoint;
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

    React.useEffect(
        function handleMount() {
            let mouseDownPosition: Point | null = null;

            function handlePointerDown(e: PointerEvent) {
                mouseDownPosition = { x: e.clientX, y: e.clientY };
                setGrabbed(true);
                document.body.classList.add("cursor-grabbing");
                document.body.classList.add("select-none");

                if (props.onSelect) {
                    props.onSelect(props.midPointType);
                }

                if (props.onGrabChange) {
                    props.onGrabChange(true);
                }

                e.stopPropagation();
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

                e.stopPropagation();
            }

            function handlePointerUp() {
                mouseDownPosition = null;
                setGrabbed(false);
                if (props.onGrabChange) {
                    props.onGrabChange(false);
                }
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
            }
            document.addEventListener("pointermove", handlePointerMove);
            document.addEventListener("pointerup", handlePointerUp);
            document.addEventListener("blur", handleBlur);

            return function handleUnmount() {
                if (ref.current) {
                    ref.current.removeEventListener("pointerdown", handlePointerDown);
                }
                document.removeEventListener("pointermove", handlePointerMove);
                document.removeEventListener("pointerup", handlePointerUp);
                document.removeEventListener("blur", handleBlur);
            };
        },
        [props.max, props.min, props.parentRef, props.onGrabChange, props.onSelect, props.midPointType]
    );

    return (
        <div
            data-color-stop-id={props.colorStopId}
            ref={ref}
            onClick={(e) => {
                e.stopPropagation();
            }}
            className={resolveClassNames(
                "absolute w-2 h-2 -translate-x-1/2 transform rotate-45 border shadow border-slate-800 -bottom-1 hover:scale-125",
                {
                    "bg-black": grabbed || props.selected,
                    "bg-white": !grabbed && !props.selected,
                    "z-50 scale-125 cursor-grabbing": grabbed,
                    "cursor-pointer": !grabbed,
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
    const [aboutToBeDeleted, setAboutToBeDeleted] = React.useState<boolean>(false);
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
            let aboutToDelete = false;

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

                if (mouseDownPosition && props.onDelete && mouseDownPosition.y - e.clientY > 20) {
                    aboutToDelete = true;
                    setAboutToBeDeleted(true);
                } else {
                    aboutToDelete = false;
                    setAboutToBeDeleted(false);
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

                e.stopPropagation();
            }

            function handlePointerUp() {
                mouseDownPosition = null;
                setGrabbed(false);
                document.body.classList.remove("cursor-grabbing");
                document.body.classList.remove("select-none");

                if (aboutToDelete && props.onDelete) {
                    props.onDelete(colorStop);
                }
            }

            function handleBlur() {
                mouseDownPosition = null;
                setGrabbed(false);
                document.body.classList.remove("cursor-grabbing");
                document.body.classList.remove("select-none");
            }

            if (ref.current) {
                ref.current.addEventListener("pointerdown", handlePointerDown);
            }
            document.addEventListener("pointermove", handlePointerMove);
            document.addEventListener("pointerup", handlePointerUp);
            document.addEventListener("blur", handleBlur);

            return function handleUnmount() {
                if (ref.current) {
                    ref.current.removeEventListener("pointerdown", handlePointerDown);
                }
                document.removeEventListener("pointermove", handlePointerMove);
                document.removeEventListener("pointerup", handlePointerUp);
                document.removeEventListener("blur", handleBlur);
            };
        },
        [props.onDelete, props.min, props.max]
    );

    return (
        <>
            <div
                data-color-stop-id={colorStop.id}
                ref={ref}
                className={resolveClassNames("absolute w-4 h-4 -translate-x-1/2 top-0 shadow hover:scale-110", {
                    "cursor-pointer": !grabbed,
                    "cursor-grabbing scale-110 z-50": grabbed,
                    "top-0": !aboutToBeDeleted,
                    "-top-1 opacity-30": aboutToBeDeleted,
                })}
                style={{
                    left: colorStop.position * 100 + "%",
                }}
                onClick={(e) => {
                    e.stopPropagation();
                }}
            >
                <div
                    className={resolveClassNames("absolute w-4 h-4 z-20 border border-slate-600")}
                    style={{
                        backgroundColor: colorStop.hexColor,
                    }}
                ></div>
                <div
                    data-color-stop-id={colorStop.id}
                    className={resolveClassNames(
                        "absolute z-10 -bottom-1.5 w-[0.71rem] h-[0.71rem] left-[0.15rem] border border-slate-600 transform rotate-45 border-t-0 shadow",
                        { "bg-white": !props.selected, "bg-black": props.selected }
                    )}
                />
                <div
                    data-color-stop-id={colorStop.id}
                    className={resolveClassNames(
                        "absolute z-20 -top-2.5 h-5 w-5 rounded-full bg-red-600 flex items-center justify-center -right-2.5",
                        { hidden: !aboutToBeDeleted }
                    )}
                >
                    <MinusIcon className="w-4 h-4 text-white" />
                </div>
            </div>
        </>
    );
};

export type AddColorStopIndicatorProps = {
    parentRef: React.MutableRefObject<HTMLDivElement | null>;
    visible: boolean;
};

const AddColorStopIndicator: React.FC<AddColorStopIndicatorProps> = (props) => {
    const [position, setPosition] = React.useState<number>(0);
    const [visible, setVisible] = React.useState<boolean>(false);

    React.useEffect(
        function handleMount() {
            let hoverable = true;

            function handlePointerDown() {
                hoverable = false;
                setVisible(false);
            }

            function handlePointerUp() {
                hoverable = true;
            }

            function handlePointerMove(e: PointerEvent) {
                if (!props.parentRef.current) {
                    return;
                }

                if (
                    !rectContainsPoint(props.parentRef.current.getBoundingClientRect(), { x: e.clientX, y: e.clientY })
                ) {
                    setVisible(false);
                    return;
                }

                if (!hoverable || !props.visible) {
                    return;
                }

                const hoveredElements = document.elementsFromPoint(e.clientX, e.clientY);
                for (const element of hoveredElements) {
                    if (element instanceof HTMLElement && element.dataset.colorStopId) {
                        setVisible(false);
                        return;
                    }
                }

                const parentRect = props.parentRef.current.getBoundingClientRect();

                const relPos = Math.min(
                    1,
                    Math.max(0, Math.round(((e.clientX - parentRect.left) / parentRect.width) * 100) / 100)
                );

                setVisible(true);
                setPosition(relPos);
            }

            document.addEventListener("pointerdown", handlePointerDown);
            document.addEventListener("pointerup", handlePointerUp);
            document.addEventListener("pointermove", handlePointerMove);

            return function handleUnmount() {
                document.removeEventListener("pointerdown", handlePointerDown);
                document.removeEventListener("pointerup", handlePointerUp);
                document.removeEventListener("pointermove", handlePointerMove);
            };
        },
        [props.visible]
    );

    return (
        <>
            <div
                className={resolveClassNames("absolute w-4 h-4 -translate-x-1/2 top-0 shadow z-50 opacity-50", {
                    hidden: !visible,
                })}
                style={{
                    left: position * 100 + "%",
                }}
            >
                <div className="absolute w-4 h-4 z-20 border border-blue-600 bg-blue-600 flex items-center justify-center">
                    <PlusIcon className="w-4 h-4 text-white" />
                </div>
                <div
                    className={resolveClassNames(
                        "absolute z-10 -bottom-1.5 w-[0.71rem] h-[0.71rem] left-[0.15rem] border border-blue-600 transform rotate-45 border-t-0 shadow bg-blue-600"
                    )}
                />
                <div className="absolute z-10 -bottom-14 h-12 w-1 bg-black border border-white left-2 -ml-0.5" />
            </div>
        </>
    );
};

export type ContinuousColorPaletteEditorProps = {
    colorPalette: ContinuousColorPalette;
    onChange?: (colorPalette: ColorPalette) => void;
    onClose?: (e: React.MouseEvent<HTMLDivElement | HTMLButtonElement, MouseEvent>) => void;
};

export const ContinuousColorPaletteEditor: React.FC<ContinuousColorPaletteEditorProps> = (props) => {
    const colorPalette = React.useRef<ContinuousColorPalette>(props.colorPalette.clone());
    const [selectedColorStopId, setSelectedColorStopId] = React.useState<string | null>(null);
    const [selectedMidPoint, setSelectedMidPoint] = React.useState<MidPoint | null>(null);
    const [midPointGrabbed, setMidPointGrabbed] = React.useState<boolean>(false);
    const forceRerender = React.useReducer((x) => x + 1, 0)[1];

    const colorStopRef = React.useRef<HTMLDivElement>(null);

    function handleSaveClick() {
        if (props.onChange) {
            props.onChange(colorPalette.current);
        }
    }

    const handleMidPointGrabChange = React.useCallback(function handleMidPointGrabChange(grabbed: boolean) {
        setMidPointGrabbed(grabbed);
    }, []);

    const handleColorStopRemove = React.useCallback(function handleColorStopRemove(colorStop: ColorStop) {
        if (colorPalette.current.getColorStops().length <= 2) {
            return;
        }
        colorPalette.current.removeColorStop(colorStop.id);
        setSelectedColorStopId(null);
        setSelectedMidPoint(null);
        forceRerender();
    }, []);

    function handleSelectedColorStopRemove() {
        if (selectedColorStopId) {
            colorPalette.current.removeColorStop(selectedColorStopId);
            setSelectedColorStopId(null);
            setSelectedMidPoint(null);
            forceRerender();
        }
    }

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
        setSelectedMidPoint(null);
    }, []);

    const handleLocationChange = React.useCallback(
        function handleLocationChange(e: React.ChangeEvent<HTMLInputElement>) {
            if (selectedColorStopId) {
                if (selectedMidPoint === null) {
                    colorPalette.current.changeColorStopPosition(selectedColorStopId, Number(e.target.value) / 100);
                } else if (selectedMidPoint === MidPoint.Start) {
                    const prev = colorPalette.current.getPreviousColorStop(selectedColorStopId);
                    if (prev) {
                        colorPalette.current.changeColorStopMidPointPosition(prev.id, Number(e.target.value) / 100);
                    }
                } else if (selectedMidPoint === MidPoint.End) {
                    colorPalette.current.changeColorStopMidPointPosition(
                        selectedColorStopId,
                        Number(e.target.value) / 100
                    );
                }
                forceRerender();
            }
        },
        [selectedColorStopId, selectedMidPoint]
    );

    function makeLocationValue() {
        if (selectedColorStopId !== null) {
            if (selectedMidPoint === null) {
                return Math.round((colorPalette.current.getColorStop(selectedColorStopId)?.position || 0) * 100);
            } else if (selectedMidPoint === MidPoint.Start) {
                return Math.round(
                    (colorPalette.current.getPreviousColorStop(selectedColorStopId)?.midPointPosition || 0) * 100
                );
            } else if (selectedMidPoint === MidPoint.End) {
                return Math.round(
                    (colorPalette.current.getColorStop(selectedColorStopId)?.midPointPosition || 0) * 100
                );
            }
        }
        return 0;
    }

    function handleAddColorStop(e: React.PointerEvent<HTMLDivElement>) {
        if (!colorStopRef.current) {
            return;
        }

        const parentRect = colorStopRef.current.getBoundingClientRect();

        const relPos = Math.min(
            1,
            Math.max(0, Math.round(((e.clientX - parentRect.left) / parentRect.width) * 100) / 100)
        );

        const interpolatedColor = colorPalette.current.getColorAtPosition(relPos);

        const id = colorPalette.current.addColorStop({
            position: relPos,
            hexColor: interpolatedColor,
            midPointPosition: 0.5,
        });

        setSelectedColorStopId(id);

        forceRerender();
    }

    const handleNameChange = React.useCallback(function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
        colorPalette.current.setName(e.target.value);
        forceRerender();
    }, []);

    return (
        <Dialog
            title="Edit color palette"
            open
            onClose={props.onClose}
            width={"25%"}
            minWidth={480}
            actions={
                <>
                    <Button onClick={props.onClose} color="danger">
                        Discard changes
                    </Button>
                    <Button onClick={handleSaveClick}>Apply changes</Button>
                </>
            }
        >
            <div className="flex flex-col gap-4">
                <Label text="Name">
                    <Input defaultValue={colorPalette.current.getName()} onChange={handleNameChange} />
                </Label>
                <Label text="Colors">
                    <div className="flex flex-col">
                        <div className="flex-grow px-2">
                            <div
                                ref={colorStopRef}
                                className={resolveClassNames("relative h-6 w-full z-[1]", {
                                    "cursor-copy": !midPointGrabbed,
                                })}
                                onClick={handleAddColorStop}
                            >
                                <AddColorStopIndicator parentRef={colorStopRef} visible={!midPointGrabbed} />
                                {colorPalette.current.getColorStops().map((stop) => {
                                    const prev = colorPalette.current.getPreviousColorStop(stop.id);
                                    const next = colorPalette.current.getNextColorStop(stop.id);
                                    return (
                                        <React.Fragment key={stop.id}>
                                            <ColorStopHandle
                                                colorStop={stop}
                                                min={prev?.position || 0}
                                                max={next?.position || 1}
                                                selected={selectedColorStopId === stop.id && selectedMidPoint === null}
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
                                                            midPointType={MidPoint.Start}
                                                            parentRef={colorStopRef}
                                                            selected={selectedMidPoint === MidPoint.Start}
                                                            value={
                                                                prev.position +
                                                                (stop.position - prev.position) * prev.midPointPosition
                                                            }
                                                            min={prev.position}
                                                            max={stop.position}
                                                            onChange={handleColorStopMidPointPositionChange}
                                                            onSelect={setSelectedMidPoint}
                                                            onGrabChange={handleMidPointGrabChange}
                                                        />
                                                    )}
                                                    {next && next.position !== stop.position && (
                                                        <ColorStopMidPointHandle
                                                            selected={selectedMidPoint === MidPoint.End}
                                                            colorStopId={stop.id}
                                                            midPointType={MidPoint.End}
                                                            parentRef={colorStopRef}
                                                            value={
                                                                stop.position +
                                                                (next.position - stop.position) * stop.midPointPosition
                                                            }
                                                            min={stop.position}
                                                            max={next.position}
                                                            onChange={handleColorStopMidPointPositionChange}
                                                            onSelect={setSelectedMidPoint}
                                                            onGrabChange={handleMidPointGrabChange}
                                                        />
                                                    )}
                                                </>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                            <div
                                className="h-12 w-full border border-slate-400 rounded-b"
                                style={{ backgroundImage: colorPalette.current.getGradient() }}
                            ></div>
                            <div
                                className={resolveClassNames("flex items-end gap-4 py-4", {
                                    "opacity-40": !selectedColorStopId,
                                })}
                            >
                                <div>
                                    <Label text="Color">
                                        <input
                                            type="color"
                                            value={
                                                colorPalette.current.getColorStop(selectedColorStopId || "")
                                                    ?.hexColor || "#000000"
                                            }
                                            onChange={(e) => {
                                                if (selectedColorStopId) {
                                                    colorPalette.current.changeColorStopColor(
                                                        selectedColorStopId,
                                                        e.target.value
                                                    );
                                                    forceRerender();
                                                }
                                            }}
                                            className={resolveClassNames(
                                                "rounded border border-slate-400 outline-none p-1 h-8",
                                                {
                                                    "cursor-pointer":
                                                        selectedColorStopId !== null && selectedMidPoint === null,
                                                    "opacity-40":
                                                        selectedColorStopId === null || selectedMidPoint !== null,
                                                }
                                            )}
                                            disabled={!selectedColorStopId || selectedMidPoint !== null}
                                        />
                                    </Label>
                                </div>
                                <div className="flex-grow">
                                    <Label text="Location">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min={0}
                                                max={100}
                                                step={1}
                                                value={makeLocationValue()}
                                                onChange={handleLocationChange}
                                                className="rounded border border-slate-400 outline-none p-1 h-8 w-full"
                                                disabled={!selectedColorStopId}
                                            />
                                            %
                                        </div>
                                    </Label>
                                </div>
                                <div>
                                    <Button
                                        startIcon={<TrashIcon className="w-4 h-4" />}
                                        onClick={handleSelectedColorStopRemove}
                                    >
                                        Remove
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </Label>
            </div>
        </Dialog>
    );
};
