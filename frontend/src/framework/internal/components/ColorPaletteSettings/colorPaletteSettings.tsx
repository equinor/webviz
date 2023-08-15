import React from "react";
import ReactDOM from "react-dom";

import { useStoreValue } from "@framework/StateStore";
import { DrawerContent, Workbench } from "@framework/Workbench";
import { ColorType } from "@framework/WorkbenchSettings";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { ColorGradient } from "@lib/components/ColorGradient";
import { ColorTileGroup } from "@lib/components/ColorTileGroup";
import { IconButton } from "@lib/components/IconButton";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { Overlay } from "@lib/components/Overlay";
import { resolveClassNames } from "@lib/components/_utils/resolveClassNames";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { CategoricalColorPalette, ColorPalette, ContinuousColorPalette } from "@lib/utils/ColorPalette";
import { convertRemToPixels } from "@lib/utils/screenUnitConversions";

import { Drawer } from "../Drawer";

enum ColorPaletteType {
    Categorical = "categorical",
    Continuous = "continuous",
    Discrete = "discrete",
}

type ColorPaletteItemProps = {
    colorPalette: ColorPalette;
    onClick?: () => void;
    selected?: boolean;
    type: ColorPaletteType;
    steps?: number;
};

const ColorPaletteItem: React.FC<ColorPaletteItemProps> = (props) => {
    function handleItemClick() {
        if (!props.onClick) {
            return;
        }

        props.onClick();
    }

    function makeColorPalettePreview(): React.ReactNode {
        switch (props.type) {
            case ColorPaletteType.Continuous:
                return <ColorGradient colorPalette={props.colorPalette as ContinuousColorPalette} />;
            case ColorPaletteType.Categorical:
                return <ColorTileGroup colorPalette={props.colorPalette as CategoricalColorPalette} />;
            case ColorPaletteType.Discrete:
                return (
                    <ColorGradient colorPalette={props.colorPalette as ContinuousColorPalette} steps={props.steps} />
                );
        }
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
        </div>
    );
};

type ColorPaletteSelectorProps = {
    colorPalettes: ColorPalette[];
    selectedColorPaletteId: string;
    onChange?: (colorPalette: ColorPalette) => void;
    onEdited?: (colorPalettes: ColorPalette[]) => void;
    type: ColorPaletteType;
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

    function makeColorPalettePreview(): React.ReactNode {
        switch (props.type) {
            case ColorPaletteType.Continuous:
                return <ColorGradient colorPalette={selectedColorPalette as ContinuousColorPalette} />;
            case ColorPaletteType.Categorical:
                return <ColorTileGroup colorPalette={selectedColorPalette as CategoricalColorPalette} />;
            case ColorPaletteType.Discrete:
                return (
                    <ColorGradient colorPalette={selectedColorPalette as ContinuousColorPalette} steps={props.steps} />
                );
        }
        return null;
    }

    const marginTop = Math.max(-boundingRect.top, convertRemToPixels((-(props.colorPalettes.length - 1) * 3) / 2));

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
    const [selectedColorPaletteIds, setSelectedColorPaletteIds] = React.useState<Record<ColorType, string>>(
        props.workbench.getWorkbenchSettings().getSelectedColorPaletteIds()
    );
    const [steps, setSteps] = React.useState<
        Record<ColorType.DiscreteDiverging | ColorType.DiscreteSequential, number>
    >(props.workbench.getWorkbenchSettings().getSteps());

    function handleColorPaletteSelected(colorPalette: ColorPalette, type: ColorType) {
        props.workbench.getWorkbenchSettings().setSelectedColorPaletteId(type, colorPalette.getId());
        setSelectedColorPaletteIds({
            ...selectedColorPaletteIds,
            [type]: colorPalette.getId(),
        });
    }

    function handleColorPaletteStepsChanged(
        newSteps: number,
        type: ColorType.DiscreteDiverging | ColorType.DiscreteSequential
    ) {
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
                        selectedColorPaletteId={selectedColorPaletteIds[ColorPaletteType.Categorical]}
                        colorPalettes={colorPalettes[ColorPaletteType.Categorical]}
                        type={ColorPaletteType.Categorical}
                        onChange={(palette) => handleColorPaletteSelected(palette, ColorType.Categorical)}
                    />
                </Label>
                <Label text="Discrete sequential colors">
                    <>
                        <ColorPaletteSelector
                            selectedColorPaletteId={selectedColorPaletteIds[ColorType.DiscreteSequential]}
                            colorPalettes={colorPalettes[ColorType.ContinuousSequential]}
                            type={ColorPaletteType.Discrete}
                            onChange={(palette) => handleColorPaletteSelected(palette, ColorType.DiscreteSequential)}
                            steps={steps[ColorType.DiscreteSequential]}
                        />
                        <Input
                            type="number"
                            min={2}
                            max={100}
                            defaultValue={steps[ColorType.DiscreteSequential]}
                            onChange={(e) =>
                                handleColorPaletteStepsChanged(parseInt(e.target.value), ColorType.DiscreteSequential)
                            }
                        />
                    </>
                </Label>
                <Label text="Continuous sequential colors">
                    <ColorPaletteSelector
                        selectedColorPaletteId={selectedColorPaletteIds[ColorType.ContinuousSequential]}
                        colorPalettes={colorPalettes[ColorType.ContinuousSequential]}
                        type={ColorPaletteType.Continuous}
                        onChange={(palette) => handleColorPaletteSelected(palette, ColorType.ContinuousSequential)}
                    />
                </Label>
                <Label text="Discrete diverging colors">
                    <>
                        <ColorPaletteSelector
                            selectedColorPaletteId={selectedColorPaletteIds[ColorType.DiscreteDiverging]}
                            colorPalettes={colorPalettes[ColorType.ContinuousDiverging]}
                            type={ColorPaletteType.Discrete}
                            onChange={(palette) => handleColorPaletteSelected(palette, ColorType.ContinuousDiverging)}
                            steps={steps[ColorType.DiscreteDiverging]}
                        />
                        <Input
                            type="number"
                            min={2}
                            max={100}
                            defaultValue={steps[ColorType.DiscreteDiverging]}
                            onChange={(e) =>
                                handleColorPaletteStepsChanged(parseInt(e.target.value), ColorType.DiscreteDiverging)
                            }
                        />
                    </>
                </Label>
                <Label text="Continuous diverging colors">
                    <ColorPaletteSelector
                        selectedColorPaletteId={selectedColorPaletteIds[ColorType.ContinuousDiverging]}
                        colorPalettes={colorPalettes[ColorType.ContinuousDiverging]}
                        type={ColorPaletteType.Continuous}
                        onChange={(palette) => handleColorPaletteSelected(palette, ColorType.ContinuousDiverging)}
                    />
                </Label>
            </div>
        </Drawer>
    );
};
