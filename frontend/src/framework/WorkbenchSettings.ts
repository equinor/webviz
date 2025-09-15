/**
 * Why are we disbling rules-of-hooks here?
 *
 * Well, we are using several hooks in this class, which is not allowed by this rule.
 * However, we are not using these hooks in a component, but in a utility class.
 * The important thing to remember is that these functions must be called on every render,
 * unconditionally (i.e. not in a conditional statement) and not in a loop.
 * This is exactly what we are doing here. We are only using the class to group the functions together
 * and give additional context to the functions.
 */

import React from "react";

import { isEqual } from "lodash";

import type { ColorPalette } from "@lib/utils/ColorPalette";
import type { ColorScaleOptions } from "@lib/utils/ColorScale";
import { ColorScale, ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";
import { ColorSet } from "@lib/utils/ColorSet";
import { usePublishSubscribeTopicValue, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";

export enum WorkbenchSettingsTopic {
    SelectedColorPalettes = "SelectedColorPalettes",
}

export type WorkbenchSettingsTopicPayloads = {
    [WorkbenchSettingsTopic.SelectedColorPalettes]: Record<ColorPaletteType, ColorPalette[]>;
};

export enum ColorPaletteType {
    Categorical = "categorical",
    ContinuousSequential = "continuous-sequential",
    ContinuousDiverging = "continuous-diverging",
}

export enum ColorScaleDiscreteSteps {
    Sequential = "sequential",
    Diverging = "diverging",
}

export interface WorkbenchSettings extends PublishSubscribe<WorkbenchSettingsTopicPayloads> {
    getSelectedColorPalette(type: ColorPaletteType): ColorPalette;
    getColorPalettes(): Record<ColorPaletteType, ColorPalette[]>;
    getSteps(): {
        [ColorScaleDiscreteSteps.Sequential]: number;
        [ColorScaleDiscreteSteps.Diverging]: number;
    };
    makeColorSet(): ColorSet;
    makeDiscreteColorScale(options: { gradientType: ColorScaleGradientType }): ColorScale;
    makeContinuousColorScale(options: { gradientType: ColorScaleGradientType }): ColorScale;
}

export function useColorSet(workbenchSettings: WorkbenchSettings): ColorSet {
    const selectedColorPalettes = usePublishSubscribeTopicValue(
        workbenchSettings,
        WorkbenchSettingsTopic.SelectedColorPalettes,
    );
    const [colorSet, setColorSet] = React.useState<ColorSet>(
        new ColorSet(workbenchSettings.getSelectedColorPalette(ColorPaletteType.Categorical)),
    );

    React.useEffect(
        function onColorPalettesChange() {
            setColorSet(new ColorSet(workbenchSettings.getSelectedColorPalette(ColorPaletteType.Categorical)));
        },
        [selectedColorPalettes, workbenchSettings],
    );

    return colorSet;
}

export function useDiscreteColorScale(
    workbenchSettings: WorkbenchSettings,
    options: { gradientType: ColorScaleGradientType },
): ColorScale {
    const selectedColorPalettes = usePublishSubscribeTopicValue(
        workbenchSettings,
        WorkbenchSettingsTopic.SelectedColorPalettes,
    );

    const optionsWithDefaults: ColorScaleOptions = {
        type: ColorScaleType.Discrete,
        colorPalette: workbenchSettings.getSelectedColorPalette(
            options.gradientType === ColorScaleGradientType.Sequential
                ? ColorPaletteType.ContinuousSequential
                : ColorPaletteType.ContinuousDiverging,
        ),
        gradientType: options.gradientType,
        steps: workbenchSettings.getSteps()[
            options.gradientType === ColorScaleGradientType.Sequential
                ? ColorScaleDiscreteSteps.Sequential
                : ColorScaleDiscreteSteps.Diverging
        ],
    };

    const divergingSteps = workbenchSettings.getSteps()[ColorScaleDiscreteSteps.Diverging];
    const sequentialSteps = workbenchSettings.getSteps()[ColorScaleDiscreteSteps.Sequential];

    const [adjustedOptions, setAdjustedOptions] = React.useState<ColorScaleOptions>(optionsWithDefaults);

    const [colorScale, setColorScale] = React.useState<ColorScale>(new ColorScale(optionsWithDefaults));

    if (!isEqual(optionsWithDefaults, adjustedOptions)) {
        setAdjustedOptions({ ...optionsWithDefaults });
    }

    React.useEffect(
        function onColorPalettesChange() {
            // Explicitly using arrow function to preserve the "this" context
            const newColorScale = new ColorScale({
                ...adjustedOptions,
                steps: options.gradientType === ColorScaleGradientType.Sequential ? sequentialSteps : divergingSteps,
                colorPalette: workbenchSettings.getSelectedColorPalette(
                    options.gradientType === ColorScaleGradientType.Sequential
                        ? ColorPaletteType.ContinuousSequential
                        : ColorPaletteType.ContinuousDiverging,
                ),
            });
            setColorScale(newColorScale);
        },
        [
            adjustedOptions,
            divergingSteps,
            sequentialSteps,
            options.gradientType,
            selectedColorPalettes,
            workbenchSettings,
        ],
    );

    return colorScale;
}

export function useContinuousColorScale(
    workbenchSettings: WorkbenchSettings,
    options: { gradientType: ColorScaleGradientType },
): ColorScale {
    const selectedColorPalettes = usePublishSubscribeTopicValue(
        workbenchSettings,
        WorkbenchSettingsTopic.SelectedColorPalettes,
    );

    const optionsWithDefaults: ColorScaleOptions = {
        type: ColorScaleType.Continuous,
        colorPalette: workbenchSettings.getSelectedColorPalette(
            options.gradientType === ColorScaleGradientType.Sequential
                ? ColorPaletteType.ContinuousSequential
                : ColorPaletteType.ContinuousDiverging,
        ),
        gradientType: options.gradientType,
        steps: workbenchSettings.getSteps()[
            options.gradientType === ColorScaleGradientType.Sequential
                ? ColorScaleDiscreteSteps.Sequential
                : ColorScaleDiscreteSteps.Diverging
        ],
    };

    const [adjustedOptions, setAdjustedOptions] = React.useState<ColorScaleOptions>(optionsWithDefaults);

    const [colorScale, setColorScale] = React.useState<ColorScale>(new ColorScale(optionsWithDefaults));

    if (!isEqual(optionsWithDefaults, adjustedOptions)) {
        setAdjustedOptions({ ...optionsWithDefaults });
    }

    React.useEffect(
        function onColorPalettesChange() {
            // Explicitly using arrow function to preserve the "this" context
            const newColorScale = new ColorScale({
                ...adjustedOptions,
                colorPalette: workbenchSettings.getSelectedColorPalette(
                    options.gradientType === ColorScaleGradientType.Sequential
                        ? ColorPaletteType.ContinuousSequential
                        : ColorPaletteType.ContinuousDiverging,
                ),
            });
            setColorScale(newColorScale);
        },
        [adjustedOptions, options.gradientType, selectedColorPalettes, workbenchSettings],
    );

    return colorScale;
}
