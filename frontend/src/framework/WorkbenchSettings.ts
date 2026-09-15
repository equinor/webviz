import React from "react";

import { isEqual } from "lodash-es";

import type { ColorPalette } from "@lib/utils/ColorPalette";
import type { ColorScaleOptions } from "@lib/utils/ColorScale";
import { ColorScale, ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";
import { ColorSet } from "@lib/utils/ColorSet";
import { usePublishSubscribeTopicValue, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";

import type { WorkbenchSettingsTopicPayloads } from "./internal/PrivateWorkbenchSettings";

export enum WorkbenchSettingsTopic {
    SELECTED_COLOR_PALETTE_IDS = "SelectedColorPaletteIds",
    SELECTED_STEPS = "SelectedSteps",
}

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
        WorkbenchSettingsTopic.SELECTED_COLOR_PALETTE_IDS,
    );

    return React.useMemo(
        () => new ColorSet(workbenchSettings.getSelectedColorPalette(ColorPaletteType.Categorical)),
        // eslint-disable-next-line @eslint-react/exhaustive-deps -- selectedColorPalettes included to trigger re-computes
        [workbenchSettings, selectedColorPalettes],
    );
}

export function useDiscreteColorScale(
    workbenchSettings: WorkbenchSettings,
    options: { gradientType: ColorScaleGradientType },
): ColorScale {
    const selectedColorPalettes = usePublishSubscribeTopicValue(
        workbenchSettings,
        WorkbenchSettingsTopic.SELECTED_COLOR_PALETTE_IDS,
    );
    const steps = usePublishSubscribeTopicValue(workbenchSettings, WorkbenchSettingsTopic.SELECTED_STEPS);

    const optionsWithDefaults: ColorScaleOptions = {
        type: ColorScaleType.Discrete,
        colorPalette: workbenchSettings.getSelectedColorPalette(
            options.gradientType === ColorScaleGradientType.Sequential
                ? ColorPaletteType.ContinuousSequential
                : ColorPaletteType.ContinuousDiverging,
        ),
        gradientType: options.gradientType,
        steps: steps[
            options.gradientType === ColorScaleGradientType.Sequential
                ? ColorScaleDiscreteSteps.Sequential
                : ColorScaleDiscreteSteps.Diverging
        ],
    };

    const divergingSteps = steps[ColorScaleDiscreteSteps.Diverging];
    const sequentialSteps = steps[ColorScaleDiscreteSteps.Sequential];

    // Storing the options in a state object to create a stable reference
    const [adjustedOptions, setAdjustedOptions] = React.useState<ColorScaleOptions>(optionsWithDefaults);

    if (!isEqual(optionsWithDefaults, adjustedOptions)) {
        setAdjustedOptions({ ...optionsWithDefaults });
    }

    return React.useMemo(
        () =>
            new ColorScale({
                ...adjustedOptions,
                steps: options.gradientType === ColorScaleGradientType.Sequential ? sequentialSteps : divergingSteps,
                colorPalette: workbenchSettings.getSelectedColorPalette(
                    options.gradientType === ColorScaleGradientType.Sequential
                        ? ColorPaletteType.ContinuousSequential
                        : ColorPaletteType.ContinuousDiverging,
                ),
            }),
        // eslint-disable-next-line @eslint-react/exhaustive-deps -- selectedColorPalette is included to trigger recomputes
        [
            selectedColorPalettes,
            adjustedOptions,
            divergingSteps,
            options.gradientType,
            sequentialSteps,
            workbenchSettings,
        ],
    );
}

export function useContinuousColorScale(
    workbenchSettings: WorkbenchSettings,
    options: { gradientType: ColorScaleGradientType },
): ColorScale {
    const selectedColorPalettes = usePublishSubscribeTopicValue(
        workbenchSettings,
        WorkbenchSettingsTopic.SELECTED_COLOR_PALETTE_IDS,
    );
    const steps = usePublishSubscribeTopicValue(workbenchSettings, WorkbenchSettingsTopic.SELECTED_STEPS);

    const optionsWithDefaults: ColorScaleOptions = {
        type: ColorScaleType.Continuous,
        colorPalette: workbenchSettings.getSelectedColorPalette(
            options.gradientType === ColorScaleGradientType.Sequential
                ? ColorPaletteType.ContinuousSequential
                : ColorPaletteType.ContinuousDiverging,
        ),
        gradientType: options.gradientType,
        steps: steps[
            options.gradientType === ColorScaleGradientType.Sequential
                ? ColorScaleDiscreteSteps.Sequential
                : ColorScaleDiscreteSteps.Diverging
        ],
    };

    const [adjustedOptions, setAdjustedOptions] = React.useState<ColorScaleOptions>(optionsWithDefaults);

    if (!isEqual(optionsWithDefaults, adjustedOptions)) {
        setAdjustedOptions({ ...optionsWithDefaults });
    }

    return React.useMemo(
        function onColorPalettesChange() {
            return new ColorScale({
                ...adjustedOptions,
                colorPalette: workbenchSettings.getSelectedColorPalette(
                    options.gradientType === ColorScaleGradientType.Sequential
                        ? ColorPaletteType.ContinuousSequential
                        : ColorPaletteType.ContinuousDiverging,
                ),
            });
        },
        // eslint-disable-next-line @eslint-react/exhaustive-deps -- selectedColorPalette is included to trigger recomputes
        [selectedColorPalettes, adjustedOptions, options.gradientType, workbenchSettings],
    );
}
