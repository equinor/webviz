import React from "react";

import { Numbers, Palette } from "@mui/icons-material";

import { GuiState, RightDrawerContent, useGuiValue } from "@framework/GuiMessageBroker";
import { Drawer } from "@framework/internal/components/Drawer";
import type { Workbench } from "@framework/Workbench";
import { ColorPaletteType, ColorScaleDiscreteSteps } from "@framework/WorkbenchSettings";
import { ColorGradient } from "@lib/components/ColorGradient";
import { ColorPaletteSelector, ColorPaletteSelectorType } from "@lib/components/ColorPaletteSelector";
import { Collapsible } from "@lib/newComponents/Collapsible";
import { FieldCompositions } from "@lib/newComponents/Field/compositions";
import { NumberInput } from "@lib/newComponents/NumberInput";
import type { ColorPalette } from "@lib/utils/ColorPalette";

export type ColorPaletteSettingsProps = {
    workbench: Workbench;
    onClose: () => void;
};

export const ColorPaletteSettings: React.FC<ColorPaletteSettingsProps> = (props) => {
    const colorPalettes = props.workbench
        .getSessionManager()
        .getActiveSession()
        .getWorkbenchSettings()
        .getColorPalettes();
    const drawerContent = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.RightDrawerContent);
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
        <Drawer
            title="Color palette settings"
            icon={<Palette />}
            visible={drawerContent === RightDrawerContent.ColorPaletteSettings}
            onClose={props.onClose}
        >
            <Collapsible.ScrollArea>
                <Collapsible.Group title="Categorical colors" defaultOpen>
                    <Collapsible.Content layoutClassName="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-xs gap-y-xs">
                        <FieldCompositions.Default label="Palette" gridLayout>
                            <ColorPaletteSelector
                                selectedColorPaletteId={selectedColorPaletteIds[ColorPaletteSelectorType.Categorical]}
                                colorPalettes={colorPalettes[ColorPaletteSelectorType.Categorical]}
                                type={ColorPaletteSelectorType.Categorical}
                                onChange={(palette) =>
                                    handleColorPaletteSelected(palette, ColorPaletteType.Categorical)
                                }
                            />
                        </FieldCompositions.Default>
                    </Collapsible.Content>
                </Collapsible.Group>
                <Collapsible.Group title="Sequential colors" defaultOpen>
                    <Collapsible.Content layoutClassName="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-xs gap-y-xs">
                        <FieldCompositions.Default label="Gradient" gridLayout>
                            <ColorPaletteSelector
                                selectedColorPaletteId={selectedColorPaletteIds[ColorPaletteType.ContinuousSequential]}
                                colorPalettes={colorPalettes[ColorPaletteType.ContinuousSequential]}
                                type={ColorPaletteSelectorType.Continuous}
                                onChange={(palette) =>
                                    handleColorPaletteSelected(palette, ColorPaletteType.ContinuousSequential)
                                }
                            />
                        </FieldCompositions.Default>
                        <FieldCompositions.Default label="Discrete steps" gridLayout>
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
                        </FieldCompositions.Default>
                    </Collapsible.Content>
                </Collapsible.Group>
                <Collapsible.Group title="Diverging colors" defaultOpen>
                    <Collapsible.Content layoutClassName="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2xs gap-y-xs">
                        <FieldCompositions.Default label="Gradient" gridLayout>
                            <ColorPaletteSelector
                                selectedColorPaletteId={selectedColorPaletteIds[ColorPaletteType.ContinuousDiverging]}
                                colorPalettes={colorPalettes[ColorPaletteType.ContinuousDiverging]}
                                type={ColorPaletteSelectorType.Continuous}
                                onChange={(palette) =>
                                    handleColorPaletteSelected(palette, ColorPaletteType.ContinuousDiverging)
                                }
                            />
                        </FieldCompositions.Default>
                        <FieldCompositions.Default label="Discrete steps" gridLayout>
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
                        </FieldCompositions.Default>
                    </Collapsible.Content>
                </Collapsible.Group>
            </Collapsible.ScrollArea>
        </Drawer>
    );
};
