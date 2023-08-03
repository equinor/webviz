import React from "react";
import ReactDOM from "react-dom";

import { useStoreState } from "@framework/StateStore";
import { ColorPaletteType, DrawerContent, Workbench } from "@framework/Workbench";
import {
    ChevronDownIcon,
    DocumentDuplicateIcon,
    PencilSquareIcon,
    PlusIcon,
    TrashIcon,
} from "@heroicons/react/20/solid";
import { Button } from "@lib/components/Button";
import { ColorGradient } from "@lib/components/ColorGradient";
import { ColorTileGroup } from "@lib/components/ColorTileGroup";
import { IconButton } from "@lib/components/IconButton";
import { Label } from "@lib/components/Label";
import { Overlay } from "@lib/components/Overlay";
import { resolveClassNames } from "@lib/components/_utils/resolveClassNames";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { CategoricalColorPalette, ColorPalette, ContinuousColorPalette } from "@lib/utils/ColorPalette";
import { convertRemToPixels } from "@lib/utils/screenUnitConversions";

import { CategoricalColorPaletteEditor } from "./private-components/categoricalColorPaletteEditor";
import { ContinuousColorPaletteEditor } from "./private-components/continuousColorPaletteEditor";

import { Drawer } from "../Drawer";

type ColorPaletteItemProps = {
    colorPalette: ColorPalette;
    continuous?: boolean;
    onRemove?: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
    onClone?: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
    onEdit?: () => void;
    onClick?: () => void;
    removable?: boolean;
    selected?: boolean;
};

const ColorPaletteItem: React.FC<ColorPaletteItemProps> = (props) => {
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
                    <ColorGradient colorPalette={props.colorPalette as ContinuousColorPalette} />
                ) : (
                    <ColorTileGroup colorPalette={props.colorPalette as CategoricalColorPalette} />
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
        const newColorPalette = colorPalette.makeCopy();
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
        const newColorPalette = props.continuous
            ? new ContinuousColorPalette([
                  {
                      hexColor: "#000000",
                      position: 0,
                      midPointPosition: 0.5,
                  },
                  {
                      hexColor: "#ffffff",
                      position: 1,
                      midPointPosition: 0.5,
                  },
              ])
            : new CategoricalColorPalette(["#000000", "#ffffff"]);

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
                    <ColorGradient colorPalette={selectedColorPalette as ContinuousColorPalette} />
                ) : (
                    <ColorTileGroup colorPalette={selectedColorPalette as CategoricalColorPalette} />
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
                        colorPalette={editColorPalette as ContinuousColorPalette}
                        onChange={handleColorPaletteEdited}
                        onClose={handleEditorClose}
                    />
                ) : (
                    <CategoricalColorPaletteEditor
                        colorPalette={editColorPalette as CategoricalColorPalette}
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
