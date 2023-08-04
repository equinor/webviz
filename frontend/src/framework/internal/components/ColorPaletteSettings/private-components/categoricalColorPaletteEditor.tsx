import React from "react";

import { CheckIcon, MinusIcon, PlusIcon } from "@heroicons/react/20/solid";
import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { resolveClassNames } from "@lib/components/_utils/resolveClassNames";
import { extrapolateHex } from "@lib/utils/ColorPalette";
import { CategoricalColor, CategoricalColorPalette } from "@lib/utils/ColorPalette";
import { MANHATTAN_LENGTH, Point, pointDifference, pointDistance } from "@lib/utils/geometry";

enum Side {
    Left = "left",
    Right = "right",
}

type EditableColorTileProps = {
    parentRef: React.RefObject<HTMLDivElement>;
    categoricalColor: CategoricalColor;
    onChange?: (categoricalColor: CategoricalColor) => void;
    onMove?: (categoricalColorId: string, otherCategoricalColorId: string, toSide: Side) => void;
    onMovePreview?: (hexColor: string | null, otherCategoricalColorId: string | null, toSide: Side) => void;
    onRemove?: (categoricalColorId: string) => void;
};

const EditableColorTile: React.FC<EditableColorTileProps> = (props) => {
    const [isDragged, setIsDragged] = React.useState(false);
    const [hidden, setHidden] = React.useState(false);
    const [position, setPosition] = React.useState({ x: 0, y: 0 });
    const [aboutToBeDeleted, setAboutToBeDeleted] = React.useState(false);

    const ref = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(function handleMount() {
        let dragging = false;
        let mouseDownPosition: Point | null = null;
        let mouseDownDistance: Point = { x: 0, y: 0 };
        let hoveredColorId: string | null = null;
        let hoveredSide: Side = Side.Left;
        let deleteColor = false;

        function determineSide(e: PointerEvent, el: HTMLElement) {
            const rect = el.getBoundingClientRect();
            const center = rect.left + rect.width / 2;
            if (e.clientX < center) {
                return Side.Left;
            }
            return Side.Right;
        }

        function handlePointerDown(e: PointerEvent) {
            mouseDownPosition = { x: e.clientX, y: e.clientY };
            if (ref.current) {
                const rect = ref.current.getBoundingClientRect();
                mouseDownDistance = pointDifference(mouseDownPosition, { x: rect.left, y: rect.top });
            }
        }

        function handlePointerMove(e: PointerEvent) {
            if (!props.parentRef.current) {
                return;
            }

            if (!mouseDownPosition) {
                return;
            }

            if (!dragging) {
                if (pointDistance(mouseDownPosition, { x: e.clientX, y: e.clientY }) > MANHATTAN_LENGTH) {
                    dragging = true;
                    setIsDragged(true);
                    document.body.classList.add("cursor-grabbing");
                    document.body.classList.add("select-none");
                } else {
                    return;
                }
            }

            const parentRect = props.parentRef.current.getBoundingClientRect();

            const newPosition = {
                x: e.clientX - parentRect.left - mouseDownDistance.x,
                y: e.clientY - parentRect.top - mouseDownDistance.y,
            };

            setPosition(newPosition);

            if (Math.abs(pointDifference(mouseDownPosition, { x: e.clientX, y: e.clientY }).y) > 50) {
                setAboutToBeDeleted(true);
                deleteColor = true;
                if (props.onMovePreview) {
                    props.onMovePreview(null, null, Side.Left);
                }
            } else {
                setAboutToBeDeleted(false);
                deleteColor = false;
            }

            const elements = document.elementsFromPoint(e.clientX, e.clientY);
            let parentHovered = false;
            for (const element of elements) {
                if (element instanceof HTMLElement && element.dataset.colorId && element !== ref.current) {
                    hoveredColorId = element.dataset.colorId;
                    hoveredSide = determineSide(e, element);

                    if (props.onMovePreview && hoveredColorId) {
                        props.onMovePreview(props.categoricalColor.hexColor, hoveredColorId, hoveredSide);
                    }
                    setHidden(true);
                    parentHovered = true;
                    break;
                }
                if (element === props.parentRef.current) {
                    parentHovered = true;
                }
            }

            if (!parentHovered) {
                hoveredColorId = null;
                if (props.onMovePreview) {
                    if (timeoutRef.current) {
                        clearTimeout(timeoutRef.current);
                    }

                    timeoutRef.current = setTimeout(() => {
                        if (props.onMovePreview) {
                            props.onMovePreview(null, null, Side.Left);
                        }
                        setHidden(false);
                    }, 1000);
                }
            }
        }

        function handlePointerUp() {
            mouseDownPosition = null;
            dragging = false;
            setIsDragged(false);
            setHidden(false);
            document.body.classList.remove("cursor-grabbing");
            document.body.classList.remove("select-none");

            if (!ref.current) {
                return;
            }

            if (deleteColor) {
                if (props.onRemove) {
                    props.onRemove(props.categoricalColor.id);
                }
                return;
            }
            deleteColor = false;

            if (props.onMove && hoveredColorId) {
                props.onMove(props.categoricalColor.id, hoveredColorId, hoveredSide);
            } else if (props.onMovePreview) {
                props.onMovePreview(null, null, Side.Left);
            }
            hoveredColorId = null;
        }

        function handleBlur() {
            mouseDownPosition = null;
            dragging = false;
            deleteColor = false;
            setIsDragged(false);
            setHidden(false);
            document.body.classList.remove("cursor-grabbing");
            document.body.classList.remove("select-none");
            if (props.onMovePreview) {
                props.onMovePreview(null, null, Side.Left);
            }
        }

        if (ref.current) {
            ref.current.addEventListener("pointerdown", handlePointerDown);
            document.addEventListener("pointermove", handlePointerMove);
            document.addEventListener("pointerup", handlePointerUp);
            document.addEventListener("blur", handleBlur);
        }

        return function handleUnmount() {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            if (ref.current) {
                ref.current.removeEventListener("pointerdown", handlePointerDown);
                document.removeEventListener("pointermove", handlePointerMove);
                document.removeEventListener("pointerup", handlePointerUp);
                document.removeEventListener("blur", handleBlur);
            }
        };
    }, []);

    function handleClick() {
        if (inputRef.current) {
            inputRef.current.click();
        }
    }

    function handleColorChange(e: React.ChangeEvent<HTMLInputElement>) {
        props.categoricalColor.hexColor = e.target.value;
        if (props.onChange) {
            props.onChange(props.categoricalColor);
        }
    }

    return (
        <>
            <div
                data-color-id={props.categoricalColor.id}
                className={resolveClassNames("w-6 h-6 flex items-center justify-center cursor-pointer relative", {
                    hidden: hidden && !aboutToBeDeleted,
                })}
                ref={ref}
                onClick={handleClick}
            >
                <div
                    className={resolveClassNames(
                        "w-6 h-6 flex items-center justify-center cursor-pointer border border-slate-600 relative",
                        {
                            "opacity-50": aboutToBeDeleted,
                        }
                    )}
                    style={{ backgroundColor: props.categoricalColor.hexColor }}
                />
                <input
                    ref={inputRef}
                    type="color"
                    value={props.categoricalColor.hexColor}
                    onChange={handleColorChange}
                    className="w-[0px] h-[0px] opacity-0 absolute cursor-pointer"
                />
                {aboutToBeDeleted && (
                    <div className="absolute rounded-full bg-red-600 w-5 h-5 flex items-center justify-center">
                        <MinusIcon className="w-4 h-4 text-white" />
                    </div>
                )}
            </div>
            <div
                className={resolveClassNames(
                    "absolute z-10 opacity-30 shadow w-6 h-6 border border-slate-600 cursor-grabbing",
                    {
                        hidden: !isDragged,
                    }
                )}
                style={{ left: position.x, top: position.y, backgroundColor: props.categoricalColor.hexColor }}
            />
        </>
    );
};

export type CategoricalColorPaletteEditorProps = {
    colorPalette: CategoricalColorPalette;
    onChange?: (colorPalette: CategoricalColorPalette) => void;
    onClose?: (e: React.MouseEvent<HTMLDivElement | HTMLButtonElement, MouseEvent>) => void;
};

export const CategoricalColorPaletteEditor: React.FC<CategoricalColorPaletteEditorProps> = (props) => {
    const forceRerender = React.useReducer((x) => x + 1, 0)[1];
    const [previewIndex, setPreviewIndex] = React.useState<number | null>(null);
    const [previewColor, setPreviewColor] = React.useState<string | null>(null);
    const [previewSide, setPreviewSide] = React.useState<Side | null>(null);

    const colorPalette = React.useRef<CategoricalColorPalette>(props.colorPalette.clone());
    const colorPaletteRef = React.useRef<HTMLDivElement>(null);

    function handleSaveClick() {
        if (props.onChange) {
            props.onChange(colorPalette.current);
        }
    }

    function handleAddColorClick() {
        const prevColor1 = colorPalette.current.getColors()[colorPalette.current.getColors().length - 2];
        const prevColor2 = colorPalette.current.getColors()[colorPalette.current.getColors().length - 1];

        const newColor = extrapolateHex(prevColor1.hexColor, prevColor2.hexColor, 1);

        colorPalette.current.addColor(newColor);
        forceRerender();
    }

    const handleMoveColor = React.useCallback(function handleMoveColor(
        colorId: string,
        otherColorId: string,
        toSide: Side
    ) {
        let otherIndex = colorPalette.current.getIndex(otherColorId);
        if (otherIndex === -1) {
            forceRerender();
            return;
        }

        if (toSide === Side.Right) {
            otherIndex++;
        }

        colorPalette.current.moveColor(colorId, otherIndex);

        setPreviewIndex(null);
        setPreviewColor(null);
        setPreviewSide(null);

        forceRerender();
    },
    []);

    const handlePreviewColor = React.useCallback(function handlePreviewColor(
        hexColor: string | null,
        colorId: string | null,
        side: Side
    ) {
        if (!hexColor || !colorId) {
            setPreviewIndex(null);
            setPreviewColor(null);
            setPreviewSide(null);
            forceRerender();
            return;
        }

        const index = colorPalette.current.getIndex(colorId);
        if (index === -1) {
            forceRerender();
            return;
        }

        setPreviewIndex(index);
        setPreviewColor(hexColor);
        setPreviewSide(side);

        forceRerender();
    },
    []);

    const handleRemoveColor = React.useCallback(function handleRemoveColor(colorId: string) {
        colorPalette.current.removeColor(colorId);
        forceRerender();
    }, []);

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
                    <div className="relative flex gap-1 flex-wrap" ref={colorPaletteRef}>
                        {colorPalette.current.getColors().map((color, index) => {
                            return (
                                <React.Fragment key={color.id}>
                                    {previewIndex === index && previewColor && previewSide === Side.Left && (
                                        <div
                                            className="opacity-30 shadow w-6 h-6 border border-slate-600"
                                            style={{ backgroundColor: previewColor }}
                                        />
                                    )}
                                    <EditableColorTile
                                        key={color.id}
                                        categoricalColor={color}
                                        parentRef={colorPaletteRef}
                                        onMove={handleMoveColor}
                                        onMovePreview={handlePreviewColor}
                                        onRemove={handleRemoveColor}
                                    />
                                    {previewIndex === index && previewColor && previewSide === Side.Right && (
                                        <div
                                            className="opacity-30 shadow w-6 h-6 border border-slate-600"
                                            style={{ backgroundColor: previewColor }}
                                        />
                                    )}
                                </React.Fragment>
                            );
                        })}
                        <div
                            className="flex items-center justify-center w-6 h-6 cursor-pointer hover:bg-slate-200"
                            title="Add color"
                            onClick={handleAddColorClick}
                        >
                            <PlusIcon className="w-4 h-4" />
                        </div>
                    </div>
                </Label>
            </div>
        </Dialog>
    );
};
