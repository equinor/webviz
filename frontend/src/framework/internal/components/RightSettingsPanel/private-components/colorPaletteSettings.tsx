import React from "react";

import { Numbers, Palette } from "@mui/icons-material";

import { Drawer } from "@framework/internal/components/Drawer";
import type { Workbench } from "@framework/Workbench";
import { ColorPaletteType, ColorScaleDiscreteSteps } from "@framework/WorkbenchSettings";
import { ColorGradient } from "@lib/components/ColorGradient";
import { ColorPaletteSelector, ColorPaletteSelectorType } from "@lib/components/ColorPaletteSelector";
import { NumberInput } from "@lib/components/NumberInput";
import { Setting } from "@lib/components/Setting";
import type { ColorPalette } from "@lib/utils/ColorPalette";

export type ColorPaletteSettingsProps = {
    workbench: Workbench;
    onClose: () => void;
};

export const ColorPaletteSettings = React.memo(function ColorPaletteSettings(props: ColorPaletteSettingsProps) {
    const colorPalettes = props.workbench
        .getSessionManager()
        .getActiveSession()
        .getWorkbenchSettings()
        .getColorPalettes();
    const [selectedColorPaletteIds, setSelectedColorPaletteIds] = React.useState<Record<ColorPaletteType, string>>(
        props.workbench.getSessionManager().getActiveSession().getWorkbenchSettings().getSelectedColorPaletteIds(),
    );
    const [steps, setSteps] = React.useState<Record<ColorScaleDiscreteSteps, number>>(
        props.workbench.getSessionManager().getActiveSession().getWorkbenchSettings().getSteps(),
    );

    function handleColorPaletteSelected(colorPalette: ColorPalette, type: ColorPaletteType) {
        props.workbench
            .getSessionManager()
            .getActiveSession()
            .getWorkbenchSettings()
            .setSelectedColorPaletteId(type, colorPalette.getId());
        setSelectedColorPaletteIds({
            ...selectedColorPaletteIds,
            [type]: colorPalette.getId(),
        });
    }

    function handleColorPaletteStepsChanged(newSteps: number | null, type: ColorScaleDiscreteSteps) {
        if (newSteps === null) return;
        props.workbench.getSessionManager().getActiveSession().getWorkbenchSettings().setStepsForType(type, newSteps);
        setSteps({
            ...steps,
            [type]: newSteps,
        });
    }

    return (
        <Drawer title="Color palette settings" icon={<Palette />} visible={true} onClose={props.onClose}>
            <Setting.ScrollArea>
                <Setting.Panel>
                    <Setting.Section title="Categorical colors" defaultOpen>
                        <Setting.Field label="Palette">
                            <ColorPaletteSelector
                                selectedColorPaletteId={selectedColorPaletteIds[ColorPaletteSelectorType.Categorical]}
                                colorPalettes={colorPalettes[ColorPaletteSelectorType.Categorical]}
                                type={ColorPaletteSelectorType.Categorical}
                                onValueChange={(palette) =>
                                    handleColorPaletteSelected(palette, ColorPaletteType.Categorical)
                                }
                            />
                        </Setting.Field>
                    </Setting.Section>
                    <Setting.Section title="Sequential colors" defaultOpen>
                        <Setting.Field label="Gradient">
                            <ColorPaletteSelector
                                selectedColorPaletteId={selectedColorPaletteIds[ColorPaletteType.ContinuousSequential]}
                                colorPalettes={colorPalettes[ColorPaletteType.ContinuousSequential]}
                                type={ColorPaletteSelectorType.Continuous}
                                onValueChange={(palette) =>
                                    handleColorPaletteSelected(palette, ColorPaletteType.ContinuousSequential)
                                }
                            />
                        </Setting.Field>
                        <Setting.Field label="Discrete steps">
                            <div className="gap-x-xs flex w-full items-center">
                                <span className="min-w-40 grow">
                                    <ColorGradient
                                        colorPalette={
                                            colorPalettes[ColorPaletteType.ContinuousSequential].find(
                                                (el) =>
                                                    el.getId() ===
                                                    selectedColorPaletteIds[ColorPaletteType.ContinuousSequential],
                                            ) || colorPalettes[ColorPaletteType.ContinuousSequential][0]
                                        }
                                        steps={steps[ColorScaleDiscreteSteps.Sequential]}
                                    />
                                </span>
                                <span className="w-24 shrink">
                                    <NumberInput
                                        min={2}
                                        max={100}
                                        value={steps[ColorScaleDiscreteSteps.Sequential]}
                                        scrubAdornment={<Numbers fontSize="inherit" />}
                                        onValueChange={(value) =>
                                            handleColorPaletteStepsChanged(value, ColorScaleDiscreteSteps.Sequential)
                                        }
                                    />
                                </span>
                            </div>
                        </Setting.Field>
                    </Setting.Section>
                    <Setting.Section title="Diverging colors" defaultOpen>
                        <Setting.Field label="Gradient">
                            <ColorPaletteSelector
                                selectedColorPaletteId={selectedColorPaletteIds[ColorPaletteType.ContinuousDiverging]}
                                colorPalettes={colorPalettes[ColorPaletteType.ContinuousDiverging]}
                                type={ColorPaletteSelectorType.Continuous}
                                onValueChange={(palette) =>
                                    handleColorPaletteSelected(palette, ColorPaletteType.ContinuousDiverging)
                                }
                            />
                        </Setting.Field>
                        <Setting.Field label="Discrete steps">
                            <div className="gap-x-xs flex w-full items-center">
                                <span className="min-w-40 grow">
                                    <ColorGradient
                                        colorPalette={
                                            colorPalettes[ColorPaletteType.ContinuousDiverging].find(
                                                (el) =>
                                                    el.getId() ===
                                                    selectedColorPaletteIds[ColorPaletteType.ContinuousDiverging],
                                            ) || colorPalettes[ColorPaletteType.ContinuousDiverging][0]
                                        }
                                        steps={steps[ColorScaleDiscreteSteps.Diverging]}
                                    />
                                </span>
                                <span className="w-24 shrink">
                                    <NumberInput
                                        min={2}
                                        max={100}
                                        value={steps[ColorScaleDiscreteSteps.Diverging]}
                                        scrubAdornment={<Numbers fontSize="inherit" />}
                                        onValueChange={(value) =>
                                            handleColorPaletteStepsChanged(value, ColorScaleDiscreteSteps.Diverging)
                                        }
                                    />
                                </span>
                            </div>
                        </Setting.Field>
                    </Setting.Section>
                </Setting.Panel>
            </Setting.ScrollArea>
        </Drawer>
    );
});
