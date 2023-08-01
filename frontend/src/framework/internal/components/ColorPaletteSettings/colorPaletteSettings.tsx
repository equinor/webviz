import React from "react";
import ReactDOM from "react-dom";

import { useStoreState } from "@framework/StateStore";
import { ColorPaletteType, DrawerContent, Workbench } from "@framework/Workbench";
import {
    CheckIcon,
    ChevronDownIcon,
    DocumentDuplicateIcon,
    PencilSquareIcon,
    PlusIcon,
    TrashIcon,
} from "@heroicons/react/20/solid";
import { Button } from "@lib/components/Button";
import { ColorGradient } from "@lib/components/ColorGradient";
import { ColorTileGroup } from "@lib/components/ColorTileGroup";
import { Dialog } from "@lib/components/Dialog";
import { IconButton } from "@lib/components/IconButton";
import { Label } from "@lib/components/Label";
import { Overlay } from "@lib/components/Overlay";
import { resolveClassNames } from "@lib/components/_utils/resolveClassNames";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ColorPalette } from "@lib/utils/ColorPalette";
import { MANHATTAN_LENGTH, Point, pointDistance } from "@lib/utils/geometry";
import { convertRemToPixels } from "@lib/utils/screenUnitConversions";

import { Drawer } from "../Drawer";

type DragIconProps = {
    className?: string;
    index: number;
};

const DragIcon: React.FC<DragIconProps> = (props) => {
    return (
        <svg
            data-color-index={props.index}
            className={props.className}
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="None"
        >
            <circle cx="8" cy="4" r="2" />
            <circle cx="8" cy="12" r="2" />
            <circle cx="8" cy="20" r="2" />
            <circle cx="16" cy="4" r="2" />
            <circle cx="16" cy="12" r="2" />
            <circle cx="16" cy="20" r="2" />
        </svg>
    );
};

type ColorPaletteEditorProps = {
    colorPalette: ColorPalette;
    onChange?: (colorPalette: ColorPalette) => void;
    onClose?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
};

const CategoricalColorPaletteEditor: React.FC<ColorPaletteEditorProps> = (props) => {
    const [colorPalette, setColorPalette] = React.useState<ColorPalette>(props.colorPalette);
    const [draggedElementIndex, setDraggedElementIndex] = React.useState<number | null>(null);
    const [hoveredElementIndex, setHoveredElementIndex] = React.useState<number | null>(null);
    const [draggedElementPosition, setDraggedElementPosition] = React.useState<Point | null>(null);

    const ref = React.useRef<HTMLDivElement>(null);

    const elementSize = useElementSize(ref);

    function handleRemoveClick(index: number) {
        const newColorPalette = colorPalette.clone();
        newColorPalette.removeColor(index);
        setColorPalette(newColorPalette);
    }

    function handleAddClick() {
        const newColorPalette = colorPalette.clone();
        newColorPalette.addColor("#000000");
        setColorPalette(newColorPalette);
    }

    React.useEffect(function handleMount() {
        let draggedElement: HTMLElement | null = null;
        let dragging = false;
        let colorIndex: number | null = null;
        let pointerDownPosition: Point = { x: 0, y: 0 };
        let innerElementPosition: Point = { x: 0, y: 0 };

        function handlePointerDown(e: PointerEvent) {
            if (e.target && e.target instanceof SVGSVGElement) {
                if (e.target.dataset.colorIndex === undefined) {
                    return;
                }

                colorIndex = parseInt(e.target.dataset.colorIndex as string);

                draggedElement = e.target.parentElement;

                if (!draggedElement) {
                    return;
                }

                const boundingRect = draggedElement.getBoundingClientRect();
                const newPointerPosition = {
                    x: e.clientX,
                    y: e.clientY,
                };
                pointerDownPosition = newPointerPosition;
                document.body.style.cursor = "grab";
                innerElementPosition = {
                    x: newPointerPosition.x - boundingRect.left,
                    y: newPointerPosition.y - boundingRect.top,
                };
                dragging = false;
            }
        }

        function handlePointerMove(e: PointerEvent) {
            if (draggedElement === null) {
                return;
            }

            if (pointDistance(pointerDownPosition, { x: e.clientX, y: e.clientY }) < MANHATTAN_LENGTH / 2) {
                return;
            }

            if (!dragging) {
                dragging = true;

                setDraggedElementIndex(colorIndex);
                document.body.style.cursor = "grabbing";
            }
            setDraggedElementPosition({
                x: e.clientX - innerElementPosition.x,
                y: e.clientY - innerElementPosition.y,
            });
        }

        function handlePointerUp() {
            if (draggedElement === null || !dragging) {
                return;
            }

            document.body.style.cursor = "default";
            draggedElement = null;
            colorIndex = null;
            setDraggedElementIndex(null);
            setDraggedElementPosition(null);
            setHoveredElementIndex(null);
        }

        window.addEventListener("pointerdown", handlePointerDown);
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);

        return () => {
            window.removeEventListener("pointerdown", handlePointerDown);
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
        };
    }, []);

    function handlePointerEnter(index: number) {
        if (draggedElementIndex === null) {
            return;
        }

        setHoveredElementIndex(index);
    }

    function handlePointerLeave() {
        setHoveredElementIndex(null);
    }

    function moveColor() {
        if (draggedElementIndex === null || hoveredElementIndex === null) {
            return;
        }

        const newColorPalette = colorPalette.clone();
        newColorPalette.moveColor(draggedElementIndex, hoveredElementIndex);
        setColorPalette(newColorPalette);
    }

    function handleSaveClick() {
        if (!props.onChange) {
            return;
        }

        props.onChange(colorPalette);
    }

    function handleColorChange(e: React.ChangeEvent<HTMLInputElement>, color: string, index: number) {
        const newColorPalette = colorPalette.clone();
        newColorPalette.changeColor(index, color);
        setColorPalette(newColorPalette);
        e.stopPropagation();
    }

    function makeContinuousEditor() {
        return (
            <div className={resolveClassNames("w-full flex flex-col select-none")} ref={ref} onPointerUp={moveColor}>
                {colorPalette.getColors().map((color, index) => {
                    return (
                        <>
                            <div
                                className={resolveClassNames("h-0.5 w-full bg-slate-800", {
                                    invisible: hoveredElementIndex !== index,
                                })}
                            />
                            <div
                                key={`${color}-${index}`}
                                className="flex items-center gap-2"
                                onPointerEnter={() => handlePointerEnter(index)}
                                onPointerLeave={handlePointerLeave}
                            >
                                <DragIcon index={index} className="w-4 h-4 cursor-grab" />
                                <input
                                    type="color"
                                    defaultValue={color}
                                    className="flex-grow h-8 cursor-pointer border-none outline-none"
                                    onBlur={(e) => handleColorChange(e, e.target.value, index)}
                                />
                                {colorPalette.getColors().length > 2 && (
                                    <IconButton onClick={() => handleRemoveClick(index)} title="Remove this color">
                                        <TrashIcon className="flex-grow-0 w-4 h-4" />
                                    </IconButton>
                                )}
                            </div>
                            {draggedElementIndex === index &&
                                draggedElementPosition &&
                                ReactDOM.createPortal(
                                    <>
                                        <div className="inset-0 fixed w-full h-full z-[60] pointer-events-none" />
                                        <div
                                            className="fixed z-[70] h-8 flex items-center gap-2 bg-white opacity-50 pointer-events-none"
                                            style={{
                                                left: draggedElementPosition.x,
                                                top: draggedElementPosition.y,
                                                width: elementSize.width,
                                            }}
                                        >
                                            <DragIcon index={index} className="w-4 h-4 cursor-grabbing" />
                                            <input
                                                type="color"
                                                defaultValue={color}
                                                className="flex-grow h-8 cursor-pointer border-none outline-none"
                                            />
                                            {colorPalette.getColors().length > 2 && (
                                                <IconButton title="Remove this color">
                                                    <TrashIcon className="flex-grow-0 w-4 h-4" />
                                                </IconButton>
                                            )}
                                        </div>
                                    </>,
                                    document.body
                                )}
                        </>
                    );
                })}
                <div
                    className={resolveClassNames("h-0.5 w-full bg-slate-800", {
                        invisible: hoveredElementIndex !== colorPalette.getColors().length,
                    })}
                />
                <div
                    className="flex items-center h-8"
                    onPointerEnter={() => handlePointerEnter(colorPalette.getColors().length)}
                    onPointerLeave={handlePointerLeave}
                ></div>
                <div className="flex items-center gap-2">
                    <Button startIcon={<PlusIcon className="w-4 h-4" />} onClick={handleAddClick}>
                        Add color
                    </Button>
                </div>
            </div>
        );
    }

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
            {makeContinuousEditor()}
        </Dialog>
    );
};

const ContinuousColorPaletteEditor: React.FC<ColorPaletteEditorProps> = (props) => {
    const [colorPalette, setColorPalette] = React.useState<ColorPalette>(props.colorPalette);

    function handleSaveClick() {
        if (!props.onChange) {
            return;
        }

        props.onChange(colorPalette);
    }

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
            <div className="w-full flex flex-col select-none"></div>
        </Dialog>
    );
};

type ColoPaletteItemProps = {
    colorPalette: ColorPalette;
    continuous?: boolean;
    onRemove?: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
    onClone?: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
    onEdit?: () => void;
    onClick?: () => void;
    removable?: boolean;
    selected?: boolean;
};

const ColorPaletteItem: React.FC<ColoPaletteItemProps> = (props) => {
    function handleRemoveClick(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        if (!props.onRemove) {
            return;
        }

        props.onRemove(e);
    }

    function handleEditClick(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        if (!props.onEdit) {
            return;
        }

        e.stopPropagation();

        props.onEdit();
    }

    function handleItemClick() {
        if (!props.onClick) {
            return;
        }

        props.onClick();
    }

    function handleCloneClick(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        if (!props.onClone) {
            return;
        }

        props.onClone(e);
    }

    return (
        <div
            className={resolveClassNames("p-2 flex items-center gap-1 hover:bg-blue-100 cursor-pointer h-12", {
                "bg-blue-50": props.selected,
            })}
            onClick={handleItemClick}
        >
            <div className="flex-grow">
                {props.continuous ? (
                    <ColorGradient colorPalette={props.colorPalette} />
                ) : (
                    <ColorTileGroup colorPalette={props.colorPalette} />
                )}
            </div>
            <IconButton onClick={handleEditClick} title="Edit this color palette">
                <PencilSquareIcon className="w-4 h-4" />
            </IconButton>
            <IconButton onClick={handleCloneClick} title="Clone this color palette">
                <DocumentDuplicateIcon className="w-4 h-4" />
            </IconButton>
            {props.removable && (
                <IconButton onClick={handleRemoveClick} title="Remove this color palette">
                    <TrashIcon className="w-4 h-4" />
                </IconButton>
            )}
        </div>
    );
};

type ColorPaletteSelectorProps = {
    colorPalettes: ColorPalette[];
    selectedColorPalette: ColorPalette;
    continuous?: boolean;
    onChange?: (colorPalette: ColorPalette) => void;
    onEdited?: (colorPalettes: ColorPalette[]) => void;
};

const ColorPaletteSelector: React.FC<ColorPaletteSelectorProps> = (props) => {
    const [open, setOpen] = React.useState<boolean>(false);
    const [editColorPalette, setEditColorPalette] = React.useState<ColorPalette | null>(null);
    const [selectedColorPalette, setSelectedColorPalette] = React.useState<ColorPalette>(props.colorPalettes[0]);

    const ref = React.useRef<HTMLDivElement>(null);
    const dropdownContentRef = React.useRef<HTMLDivElement>(null);

    const boundingRect = useElementBoundingRect(ref);

    React.useEffect(
        function addPointerEvents() {
            function handlePointerDown(event: PointerEvent) {
                if (dropdownContentRef.current?.contains(event.target as Node) || editColorPalette) {
                    return;
                }

                setOpen(false);
            }

            window.addEventListener("pointerdown", handlePointerDown);

            return () => {
                window.removeEventListener("pointerdown", handlePointerDown);
            };
        },
        [editColorPalette]
    );

    function handleChevronClick() {
        setOpen(!open);
    }

    function handleEditorColorClick(colorPalette: ColorPalette) {
        setEditColorPalette(colorPalette);
    }

    function handleCloneColorPaletteClick(colorPalette: ColorPalette) {
        const newColorPalette = new ColorPalette(colorPalette.getColors());
        const newColorPalettes = [...props.colorPalettes, newColorPalette];

        if (!props.onEdited) {
            return;
        }

        props.onEdited(newColorPalettes);
    }

    function handleColorPaletteSelected(colorPalette: ColorPalette) {
        setSelectedColorPalette(colorPalette);
        setOpen(false);

        if (!props.onChange) {
            return;
        }

        props.onChange(colorPalette);
    }

    function renderColorPalettes() {
        return props.colorPalettes.map((colorPalette) => (
            <ColorPaletteItem
                key={colorPalette.getUuid()}
                colorPalette={colorPalette}
                continuous={props.continuous}
                onRemove={(e) => {
                    handleRemoveColorPaletteClick(colorPalette);
                    e.stopPropagation();
                }}
                onClone={(e) => {
                    handleCloneColorPaletteClick(colorPalette);
                    e.stopPropagation();
                }}
                onClick={() => {
                    handleColorPaletteSelected(colorPalette);
                }}
                removable={props.colorPalettes.length > 1}
                onEdit={() => handleEditorColorClick(colorPalette)}
                selected={selectedColorPalette.getUuid() === colorPalette.getUuid()}
            />
        ));
    }

    function handleEditorClose(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        setEditColorPalette(null);
        e.stopPropagation();
    }

    function handleColorPaletteEdited(colorPalette: ColorPalette) {
        if (!props.onEdited) {
            return;
        }

        const newColorPalettes = props.colorPalettes.map((palette) => {
            if (palette.getUuid() === colorPalette.getUuid()) {
                return colorPalette;
            }

            return palette;
        });

        props.onEdited(newColorPalettes);
        setEditColorPalette(null);

        if (selectedColorPalette.getUuid() === colorPalette.getUuid()) {
            setSelectedColorPalette(colorPalette);
        }
    }

    function handleAddColorPaletteClick() {
        const newColorPalette = new ColorPalette(["#000000", "#ffffff"]);
        const newColorPalettes = [...props.colorPalettes, newColorPalette];

        if (!props.onEdited) {
            return;
        }

        props.onEdited(newColorPalettes);
    }

    function handleRemoveColorPaletteClick(colorPalette: ColorPalette) {
        const newColorPalettes = props.colorPalettes.filter((palette) => palette.getUuid() !== colorPalette.getUuid());

        if (props.onEdited) {
            props.onEdited(newColorPalettes);
        }

        if (selectedColorPalette.getUuid() === colorPalette.getUuid()) {
            setSelectedColorPalette(newColorPalettes[0]);
        }
    }

    const marginTop = Math.max(-boundingRect.top, convertRemToPixels((-props.colorPalettes.length * 3) / 2));

    return (
        <div className="bg-slate-100 rounded p-2 flex items-center gap-4" ref={ref}>
            <div className="flex-grow">
                {props.continuous ? (
                    <ColorGradient colorPalette={selectedColorPalette} />
                ) : (
                    <ColorTileGroup colorPalette={selectedColorPalette} />
                )}
            </div>
            <IconButton onClick={handleChevronClick}>
                <ChevronDownIcon className="flex-grow-0 w-4 h-4" />
            </IconButton>
            {open &&
                ReactDOM.createPortal(
                    <>
                        <Overlay visible={true} />
                        <div
                            ref={dropdownContentRef}
                            className="absolute z-[60] shadow bg-white rounded overflow-hidden"
                            style={{
                                left: boundingRect.left,
                                top: boundingRect.top,
                                width: boundingRect.width,
                                marginTop: marginTop,
                                height: `${props.colorPalettes.length * 3 + 3}rem`,
                            }}
                        >
                            {renderColorPalettes()}
                            <div className="bg-slate-200 p-2 flex items-center gap-4 h-12 shadow">
                                <Button
                                    startIcon={<PlusIcon className="w-4 h-4" />}
                                    onClick={handleAddColorPaletteClick}
                                >
                                    Add color palette
                                </Button>
                            </div>
                        </div>
                    </>,
                    document.body
                )}
            {editColorPalette &&
                (props.continuous ? (
                    <ContinuousColorPaletteEditor
                        colorPalette={editColorPalette}
                        onChange={handleColorPaletteEdited}
                        onClose={handleEditorClose}
                    />
                ) : (
                    <CategoricalColorPaletteEditor
                        colorPalette={editColorPalette}
                        onChange={handleColorPaletteEdited}
                        onClose={handleEditorClose}
                    />
                ))}
        </div>
    );
};

export type ColorPaletteSettingsProps = {
    workbench: Workbench;
};

export const ColorPaletteSettings: React.FC<ColorPaletteSettingsProps> = (props) => {
    const [drawerContent, setDrawerContent] = useStoreState(props.workbench.getGuiStateStore(), "drawerContent");
    const [colorPalettes, setColorPalettes] = React.useState<Record<string, ColorPalette[]>>(
        props.workbench.getColorPalettes()
    );
    const [selectedColorPalette, setSelectedColorPalette] = React.useState<Record<string, ColorPalette>>({
        [ColorPaletteType.Categorical]: props.workbench.getSelectedColorPalette(ColorPaletteType.Categorical),
        [ColorPaletteType.Continuous]: props.workbench.getSelectedColorPalette(ColorPaletteType.Continuous),
    });

    const handleDrawerClose = () => {
        setDrawerContent(DrawerContent.None);
    };

    function handleColorPaletteEdited(colorPalettes: ColorPalette[], type: ColorPaletteType) {
        props.workbench.setColorPalettes(colorPalettes, type);
        setColorPalettes({ ...props.workbench.getColorPalettes() });
    }

    function handleColorPaletteSelected(colorPalette: ColorPalette, type: ColorPaletteType) {
        props.workbench.setSelectedColorPalette(colorPalette, type);
        setSelectedColorPalette({
            ...selectedColorPalette,
            [type]: colorPalette,
        });
    }

    return (
        <Drawer
            title="Color palette settings"
            visible={drawerContent === DrawerContent.ColorPaletteSettings}
            onClose={handleDrawerClose}
        >
            <div className="flex flex-col gap-2">
                <Label text="Categorical colors">
                    <ColorPaletteSelector
                        selectedColorPalette={selectedColorPalette[ColorPaletteType.Categorical]}
                        colorPalettes={colorPalettes[ColorPaletteType.Categorical]}
                        onEdited={(palette) => handleColorPaletteEdited(palette, ColorPaletteType.Categorical)}
                        onChange={(palette) => handleColorPaletteSelected(palette, ColorPaletteType.Categorical)}
                    />
                </Label>
                <Label text="Continuous colors">
                    <ColorPaletteSelector
                        selectedColorPalette={selectedColorPalette[ColorPaletteType.Continuous]}
                        colorPalettes={colorPalettes[ColorPaletteType.Continuous]}
                        continuous
                        onEdited={(palette) => handleColorPaletteEdited(palette, ColorPaletteType.Continuous)}
                        onChange={(palette) => handleColorPaletteSelected(palette, ColorPaletteType.Categorical)}
                    />
                </Label>
            </div>
        </Drawer>
    );
};
