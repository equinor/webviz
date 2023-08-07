import React from "react";
import ReactDOM from "react-dom";

import { useStoreValue } from "@framework/StateStore";
import { ColorType, DrawerContent, Workbench } from "@framework/Workbench";
import {
    ChevronDownIcon,
    DocumentDuplicateIcon,
    EllipsisVerticalIcon,
    PencilSquareIcon,
    PlusIcon,
    TrashIcon,
} from "@heroicons/react/20/solid";
import { Button } from "@lib/components/Button";
import { ColorGradient } from "@lib/components/ColorGradient";
import { ColorTileGroup } from "@lib/components/ColorTileGroup";
import { IconButton } from "@lib/components/IconButton";
import { Label } from "@lib/components/Label";
import { Menu } from "@lib/components/Menu";
import { MenuItem } from "@lib/components/MenuItem";
import { Overlay } from "@lib/components/Overlay";
import { resolveClassNames } from "@lib/components/_utils/resolveClassNames";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { CategoricalColorPalette, ColorPalette, ContinuousColorPalette } from "@lib/utils/ColorPalette";
import { convertRemToPixels } from "@lib/utils/screenUnitConversions";

import { CategoricalColorPaletteEditor } from "./private-components/categoricalColorPaletteEditor";
import { ContinuousColorPaletteEditor } from "./private-components/continuousColorPaletteEditor";

import { Drawer } from "../Drawer";

enum ColorPaletteType {
    Set = "set",
    Categorical = "categorical",
    Continuous = "continuous",
}

type ColorPaletteItemProps = {
    colorPalette: ColorPalette;
    type: ColorPaletteType;
    onRemove?: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
    onClone?: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
    onEdit?: () => void;
    onClick?: () => void;
    removable?: boolean;
    selected?: boolean;
    onMenuOpenChange?: (open: boolean) => void;
};

const ColorPaletteItem: React.FC<ColorPaletteItemProps> = (props) => {
    const anchorRef = React.useRef<HTMLButtonElement>(null);
    const [menuOpen, setMenuOpen] = React.useState<boolean>(false);

    function handleOpenMenu(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        setMenuOpen(true);
        e.stopPropagation();
        if (props.onMenuOpenChange) {
            props.onMenuOpenChange(true);
        }
    }

    function handleCloseMenu() {
        setMenuOpen(false);
        if (props.onMenuOpenChange) {
            props.onMenuOpenChange(false);
        }
    }

    function handleRemoveClick(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        if (!props.onRemove) {
            return;
        }

        props.onRemove(e);
        handleCloseMenu();
    }

    function handleEditClick(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        if (!props.onEdit) {
            return;
        }

        e.stopPropagation();

        props.onEdit();
        handleCloseMenu();
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
        handleCloseMenu();
    }

    function makeColorPalettePreview(): React.ReactNode {
        switch (props.type) {
            case ColorPaletteType.Continuous:
                return <ColorGradient colorPalette={props.colorPalette as ContinuousColorPalette} />;
            case ColorPaletteType.Categorical:
                return <ColorTileGroup colorPalette={props.colorPalette as CategoricalColorPalette} />;
            case ColorPaletteType.Set:
                return <ColorTileGroup gap colorPalette={props.colorPalette as CategoricalColorPalette} />;
        }
        return null;
    }

    return (
        <div
            className={resolveClassNames("p-2 flex items-center gap-2 hover:bg-blue-100 cursor-pointer h-12", {
                "bg-blue-50": props.selected,
            })}
            onClick={handleItemClick}
        >
            <span
                className="text-sm leading-none min-w-0 w-20 whitespace-nowrap text-ellipsis overflow-hidden"
                title={props.colorPalette.getName()}
            >
                {props.colorPalette.getName()}
            </span>
            <div className="flex-grow">{makeColorPalettePreview()}</div>
            <IconButton onClick={handleOpenMenu} ref={anchorRef} title="More options">
                <EllipsisVerticalIcon className="flex-grow-0 w-4 h-4" />
            </IconButton>
            <Menu open={menuOpen} anchorEl={anchorRef.current} onOpenChange={handleCloseMenu} className="z-[70]">
                <MenuItem onClick={handleEditClick}>
                    <PencilSquareIcon className="w-4 h-4 mr-2" />
                    Edit
                </MenuItem>
                <MenuItem onClick={handleCloneClick}>
                    <DocumentDuplicateIcon className="w-4 h-4 mr-2" />
                    Clone
                </MenuItem>
                {props.removable && (
                    <MenuItem onClick={handleRemoveClick}>
                        <TrashIcon className="w-4 h-4 mr-2" />
                        Remove
                    </MenuItem>
                )}
            </Menu>
        </div>
    );
};

type ColorPaletteSelectorProps = {
    colorPalettes: ColorPalette[];
    selectedColorPaletteUuid: string;
    type: ColorPaletteType;
    onChange?: (colorPalette: ColorPalette) => void;
    onEdited?: (colorPalettes: ColorPalette[]) => void;
};

const ColorPaletteSelector: React.FC<ColorPaletteSelectorProps> = (props) => {
    const [open, setOpen] = React.useState<boolean>(false);
    const [menuOpen, setMenuOpen] = React.useState<boolean>(false);
    const [editColorPalette, setEditColorPalette] = React.useState<ColorPalette | null>(null);
    const [selectedColorPalette, setSelectedColorPalette] = React.useState<ColorPalette>(
        props.colorPalettes.find((el) => el.getUuid() === props.selectedColorPaletteUuid) || props.colorPalettes[0]
    );

    const ref = React.useRef<HTMLDivElement>(null);
    const dropdownContentRef = React.useRef<HTMLDivElement>(null);

    const boundingRect = useElementBoundingRect(ref);

    React.useEffect(
        function addPointerEvents() {
            function handlePointerDown(event: PointerEvent) {
                if (dropdownContentRef.current?.contains(event.target as Node) || editColorPalette || menuOpen) {
                    return;
                }

                setOpen(false);
            }

            window.addEventListener("pointerdown", handlePointerDown);

            return () => {
                window.removeEventListener("pointerdown", handlePointerDown);
            };
        },
        [editColorPalette, menuOpen]
    );

    function handleChevronClick() {
        setOpen(!open);
    }

    function handleMenuOpenChange(open: boolean) {
        setMenuOpen(open);
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
                type={props.type}
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
                onMenuOpenChange={handleMenuOpenChange}
            />
        ));
    }

    function handleEditorClose(e: React.MouseEvent<HTMLDivElement | HTMLButtonElement, MouseEvent>) {
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
        const newColorPalette =
            props.type === ColorPaletteType.Continuous
                ? new ContinuousColorPalette("New color palette", [
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
                : new CategoricalColorPalette("New color palette", ["#000000", "#ffffff"]);

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

    function makeColorPalettePreview(): React.ReactNode {
        switch (props.type) {
            case ColorPaletteType.Continuous:
                return <ColorGradient colorPalette={selectedColorPalette as ContinuousColorPalette} />;
            case ColorPaletteType.Categorical:
                return <ColorTileGroup colorPalette={selectedColorPalette as CategoricalColorPalette} />;
            case ColorPaletteType.Set:
                return <ColorTileGroup gap colorPalette={selectedColorPalette as CategoricalColorPalette} />;
        }
        return null;
    }

    const marginTop = Math.max(-boundingRect.top, convertRemToPixels((-props.colorPalettes.length * 3) / 2));

    return (
        <div className="bg-slate-100 rounded p-2 flex items-center gap-4" ref={ref}>
            <div className="flex-grow">{makeColorPalettePreview()}</div>
            <IconButton onClick={handleChevronClick}>
                <ChevronDownIcon className="flex-grow-0 w-4 h-4" />
            </IconButton>
            {open &&
                ReactDOM.createPortal(
                    <>
                        <Overlay visible={true} />
                        <div
                            ref={dropdownContentRef}
                            className={resolveClassNames("absolute z-[60] shadow bg-white rounded overflow-hidden", {
                                "pointer-events-none mix-blend-lighten": editColorPalette !== null,
                            })}
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
                (props.type === ColorPaletteType.Continuous ? (
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
    const drawerContent = useStoreValue(props.workbench.getGuiStateStore(), "drawerContent");
    const [colorPalettes, setColorPalettes] = React.useState<Record<string, ColorPalette[]>>(
        props.workbench.getColorPalettes()
    );
    const [selectedColorPaletteUuids, setSelectedColorPaletteUuids] = React.useState<Record<ColorType, string>>({
        [ColorType.Set]: props.workbench.getSelectedColorPaletteUuid(ColorType.Set),
        [ColorType.Categorical]: props.workbench.getSelectedColorPaletteUuid(ColorType.Categorical),
        [ColorType.Sequential]: props.workbench.getSelectedColorPaletteUuid(ColorType.Sequential),
        [ColorType.Diverging]: props.workbench.getSelectedColorPaletteUuid(ColorType.Diverging),
    });

    function handleColorPaletteEdited(colorPalettes: ColorPalette[], type: ColorType) {
        props.workbench.setColorPalettes(colorPalettes, type);
        setColorPalettes({ ...props.workbench.getColorPalettes() });
    }

    function handleColorPaletteSelected(colorPalette: ColorPalette, type: ColorType) {
        props.workbench.setSelectedColorPalette(colorPalette.getUuid(), type);
        setSelectedColorPaletteUuids({
            ...selectedColorPaletteUuids,
            [type]: colorPalette.getUuid(),
        });
    }

    return (
        <Drawer title="Color palette settings" visible={drawerContent === DrawerContent.ColorPaletteSettings}>
            <div className="flex flex-col gap-2">
                <Label text="Categorical colors">
                    <ColorPaletteSelector
                        selectedColorPaletteUuid={selectedColorPaletteUuids[ColorPaletteType.Categorical]}
                        colorPalettes={colorPalettes[ColorPaletteType.Categorical]}
                        type={ColorPaletteType.Categorical}
                        onEdited={(palette) => handleColorPaletteEdited(palette, ColorType.Categorical)}
                        onChange={(palette) => handleColorPaletteSelected(palette, ColorType.Categorical)}
                    />
                </Label>
                <Label text="Sequential colors">
                    <ColorPaletteSelector
                        selectedColorPaletteUuid={selectedColorPaletteUuids[ColorType.Sequential]}
                        colorPalettes={colorPalettes[ColorType.Sequential]}
                        type={ColorPaletteType.Continuous}
                        onEdited={(palette) => handleColorPaletteEdited(palette, ColorType.Sequential)}
                        onChange={(palette) => handleColorPaletteSelected(palette, ColorType.Sequential)}
                    />
                </Label>
                <Label text="Diverging colors">
                    <ColorPaletteSelector
                        selectedColorPaletteUuid={selectedColorPaletteUuids[ColorType.Diverging]}
                        colorPalettes={colorPalettes[ColorType.Diverging]}
                        type={ColorPaletteType.Continuous}
                        onEdited={(palette) => handleColorPaletteEdited(palette, ColorType.Diverging)}
                        onChange={(palette) => handleColorPaletteSelected(palette, ColorType.Diverging)}
                    />
                </Label>
            </div>
        </Drawer>
    );
};
