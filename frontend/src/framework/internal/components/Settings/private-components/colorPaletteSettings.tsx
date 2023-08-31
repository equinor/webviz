import React from "react";
import ReactDOM from "react-dom";

import { useStoreValue } from "@framework/StateStore";
import { DrawerContent, Workbench } from "@framework/Workbench";
import { ColorPaletteType, ColorScaleDiscreteSteps } from "@framework/WorkbenchSettings";
import { Drawer } from "@framework/internal/components/Drawer";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { ColorGradient } from "@lib/components/ColorGradient";
import { ColorTileGroup } from "@lib/components/ColorTileGroup";
import { IconButton } from "@lib/components/IconButton";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { Overlay } from "@lib/components/Overlay";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { ColorPalette } from "@lib/utils/ColorPalette";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { convertRemToPixels } from "@lib/utils/screenUnitConversions";

enum ColorPaletteSelectorType {
    Categorical = "categorical",
    Continuous = "continuous",
    Discrete = "discrete",
}

function makeColorPalettePreview(
    colorPalette: ColorPalette,
    type: ColorPaletteSelectorType,
    steps?: number
): React.ReactNode {
    switch (type) {
        case ColorPaletteSelectorType.Continuous:
            return <ColorGradient colorPalette={colorPalette} />;
        case ColorPaletteSelectorType.Categorical:
            return <ColorTileGroup colorPalette={colorPalette} />;
        case ColorPaletteSelectorType.Discrete:
            return <ColorGradient colorPalette={colorPalette} steps={steps} />;
    }
}

type ColorPaletteItemProps = {
    colorPalette: ColorPalette;
    onClick?: () => void;
    selected?: boolean;
    type: ColorPaletteSelectorType;
    steps?: number;
};

const ColorPaletteItem: React.FC<ColorPaletteItemProps> = (props) => {
    function handleItemClick() {
        if (!props.onClick) {
            return;
        }

        props.onClick();
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
            <div className="flex-grow">{makeColorPalettePreview(props.colorPalette, props.type, props.steps)}</div>
        </div>
    );
};

type ColorPaletteSelectorProps = {
    colorPalettes: ColorPalette[];
    selectedColorPaletteId: string;
    onChange?: (colorPalette: ColorPalette) => void;
    type: ColorPaletteSelectorType;
    steps?: number;
};

const ColorPaletteSelector: React.FC<ColorPaletteSelectorProps> = (props) => {
    const [open, setOpen] = React.useState<boolean>(false);
    const [selectedColorPalette, setSelectedColorPalette] = React.useState<ColorPalette>(
        props.colorPalettes.find((el) => el.getId() === props.selectedColorPaletteId) || props.colorPalettes[0]
    );

    const ref = React.useRef<HTMLDivElement>(null);
    const dropdownContentRef = React.useRef<HTMLDivElement>(null);

    const boundingRect = useElementBoundingRect(ref);

    React.useEffect(function addPointerEvents() {
        function handlePointerDown(event: PointerEvent) {
            if (dropdownContentRef.current?.contains(event.target as Node)) {
                return;
            }

            setOpen(false);
        }

        window.addEventListener("pointerdown", handlePointerDown);

        return () => {
            window.removeEventListener("pointerdown", handlePointerDown);
        };
    }, []);

    function handleChevronClick() {
        setOpen(!open);
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
                key={colorPalette.getId()}
                colorPalette={colorPalette}
                type={props.type}
                onClick={() => {
                    handleColorPaletteSelected(colorPalette);
                }}
                selected={selectedColorPalette.getId() === colorPalette.getId()}
                steps={props.steps}
            />
        ));
    }

    const marginTop = Math.max(-boundingRect.top, convertRemToPixels((-(props.colorPalettes.length - 1) * 3) / 2));

    return (
        <div className="bg-slate-100 rounded p-2 flex items-center gap-4" ref={ref}>
            <div className="flex-grow">{makeColorPalettePreview(selectedColorPalette, props.type, props.steps)}</div>
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
                                height: `${props.colorPalettes.length * 3}rem`,
                            }}
                        >
                            {renderColorPalettes()}
                        </div>
                    </>,
                    document.body
                )}
        </div>
    );
};

export type ColorPaletteSettingsProps = {
    workbench: Workbench;
};

export const ColorPaletteSettings: React.FC<ColorPaletteSettingsProps> = (props) => {
    const colorPalettes = props.workbench.getWorkbenchSettings().getColorPalettes();
    const drawerContent = useStoreValue(props.workbench.getGuiStateStore(), "drawerContent");
    const [selectedColorPaletteIds, setSelectedColorPaletteIds] = React.useState<Record<ColorPaletteType, string>>(
        props.workbench.getWorkbenchSettings().getSelectedColorPaletteIds()
    );
    const [steps, setSteps] = React.useState<Record<ColorScaleDiscreteSteps, number>>(
        props.workbench.getWorkbenchSettings().getSteps()
    );

    function handleColorPaletteSelected(colorPalette: ColorPalette, type: ColorPaletteType) {
        props.workbench.getWorkbenchSettings().setSelectedColorPaletteId(type, colorPalette.getId());
        setSelectedColorPaletteIds({
            ...selectedColorPaletteIds,
            [type]: colorPalette.getId(),
        });
    }

    function handleColorPaletteStepsChanged(newSteps: number, type: ColorScaleDiscreteSteps) {
        props.workbench.getWorkbenchSettings().setStepsForType(type, newSteps);
        setSteps({
            ...steps,
            [type]: newSteps,
        });
    }

    return (
        <Drawer title="Color palette settings" visible={drawerContent === DrawerContent.ColorPaletteSettings}>
            <div className="flex flex-col gap-2">
                <Label text="Categorical colors">
                    <ColorPaletteSelector
                        selectedColorPaletteId={selectedColorPaletteIds[ColorPaletteSelectorType.Categorical]}
                        colorPalettes={colorPalettes[ColorPaletteSelectorType.Categorical]}
                        type={ColorPaletteSelectorType.Categorical}
                        onChange={(palette) => handleColorPaletteSelected(palette, ColorPaletteType.Categorical)}
                    />
                </Label>
                <Label text="Sequential colors" wrapperClassName="mb-4 mt-4">
                    <div className="flex flex-col gap-4">
                        <ColorPaletteSelector
                            selectedColorPaletteId={selectedColorPaletteIds[ColorPaletteType.ContinuousSequential]}
                            colorPalettes={colorPalettes[ColorPaletteType.ContinuousSequential]}
                            type={ColorPaletteSelectorType.Continuous}
                            onChange={(palette) =>
                                handleColorPaletteSelected(palette, ColorPaletteType.ContinuousSequential)
                            }
                        />
                        <ColorGradient
                            colorPalette={
                                colorPalettes[ColorPaletteType.ContinuousSequential].find(
                                    (el) =>
                                        el.getId() === selectedColorPaletteIds[ColorPaletteType.ContinuousSequential]
                                ) || colorPalettes[ColorPaletteType.ContinuousSequential][0]
                            }
                            steps={steps[ColorScaleDiscreteSteps.Sequential]}
                        />
                        <Label text="Discrete steps" position="left">
                            <Input
                                type="number"
                                min={2}
                                max={100}
                                defaultValue={steps[ColorScaleDiscreteSteps.Sequential]}
                                onChange={(e) =>
                                    handleColorPaletteStepsChanged(
                                        parseInt(e.target.value),
                                        ColorScaleDiscreteSteps.Sequential
                                    )
                                }
                            />
                        </Label>
                    </div>
                </Label>
                <Label text="Diverging colors" wrapperClassName="mb-4 mt-4">
                    <div className="flex flex-col gap-4">
                        <ColorPaletteSelector
                            selectedColorPaletteId={selectedColorPaletteIds[ColorPaletteType.ContinuousDiverging]}
                            colorPalettes={colorPalettes[ColorPaletteType.ContinuousDiverging]}
                            type={ColorPaletteSelectorType.Continuous}
                            onChange={(palette) =>
                                handleColorPaletteSelected(palette, ColorPaletteType.ContinuousDiverging)
                            }
                        />
                        <ColorGradient
                            colorPalette={
                                colorPalettes[ColorPaletteType.ContinuousDiverging].find(
                                    (el) => el.getId() === selectedColorPaletteIds[ColorPaletteType.ContinuousDiverging]
                                ) || colorPalettes[ColorPaletteType.ContinuousDiverging][0]
                            }
                            steps={steps[ColorScaleDiscreteSteps.Diverging]}
                        />
                        <Label text="Discrete steps" position="left">
                            <Input
                                type="number"
                                min={2}
                                max={100}
                                defaultValue={steps[ColorScaleDiscreteSteps.Diverging]}
                                onChange={(e) =>
                                    handleColorPaletteStepsChanged(
                                        parseInt(e.target.value),
                                        ColorScaleDiscreteSteps.Diverging
                                    )
                                }
                            />
                        </Label>
                    </div>
                </Label>
            </div>
        </Drawer>
    );
};
