import React from "react";

import { DrawerContent, GuiState, useGuiValue } from "@framework/GuiMessageBroker";
import { Workbench } from "@framework/Workbench";
import { ColorPaletteType, ColorScaleDiscreteSteps } from "@framework/WorkbenchSettings";
import { Drawer } from "@framework/internal/components/Drawer";
import { ColorGradient } from "@lib/components/ColorGradient";
import { ColorPaletteSelector, ColorPaletteSelectorType } from "@lib/components/ColorPaletteSelector";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { ColorPalette } from "@lib/utils/ColorPalette";
import { Palette } from "@mui/icons-material";

export type ColorPaletteSettingsProps = {
    workbench: Workbench;
};

export const ColorPaletteSettings: React.FC<ColorPaletteSettingsProps> = (props) => {
    const colorPalettes = props.workbench.getWorkbenchSettings().getColorPalettes();
    const drawerContent = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.DrawerContent);
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
        <Drawer
            title="Color palette settings"
            icon={<Palette />}
            visible={drawerContent === DrawerContent.ColorPaletteSettings}
        >
            <div className="flex flex-col gap-2 m-2">
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
