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

/* eslint-disable react-hooks/rules-of-hooks */
import React from "react";

import { WorkbenchSettingsEvents } from "@framework/internal/PrivateWorkbenchSettings";
import { ColorPalette } from "@lib/utils/ColorPalette";
import { ColorScale, ColorScaleGradientType, ColorScaleOptions, ColorScaleType } from "@lib/utils/ColorScale";
import { ColorSet } from "@lib/utils/ColorSet";

import { isEqual } from "lodash";

import {
    defaultColorPalettes,
    defaultContinuousDivergingColorPalettes,
    defaultContinuousSequentialColorPalettes,
} from "./utils/colorPalettes";

export enum ColorPaletteType {
    Categorical = "categorical",
    ContinuousSequential = "continuous-sequential",
    ContinuousDiverging = "continuous-diverging",
}

export enum ColorScaleDiscreteSteps {
    Sequential = "sequential",
    Diverging = "diverging",
}

export class WorkbenchSettings {
    protected _colorPalettes: Record<ColorPaletteType, ColorPalette[]>;
    protected _selectedColorPalettes: Record<ColorPaletteType, string>;
    protected _steps: {
        [ColorScaleDiscreteSteps.Sequential]: number;
        [ColorScaleDiscreteSteps.Diverging]: number;
    };
    protected _subscribersMap: { [key: string]: Set<() => void> };

    constructor() {
        this._subscribersMap = {};

        this._colorPalettes = {
            [ColorPaletteType.Categorical]: defaultColorPalettes,
            [ColorPaletteType.ContinuousSequential]: defaultContinuousSequentialColorPalettes,
            [ColorPaletteType.ContinuousDiverging]: defaultContinuousDivergingColorPalettes,
        };
        this._selectedColorPalettes = {
            [ColorPaletteType.Categorical]: defaultColorPalettes[0].getId(),
            [ColorPaletteType.ContinuousSequential]: defaultContinuousSequentialColorPalettes[0].getId(),
            [ColorPaletteType.ContinuousDiverging]: defaultContinuousDivergingColorPalettes[0].getId(),
        };

        this._steps = {
            [ColorScaleDiscreteSteps.Sequential]: 10,
            [ColorScaleDiscreteSteps.Diverging]: 10,
        };
    }

    protected getSelectedColorPalette(type: ColorPaletteType): ColorPalette {
        const colorPalette = this._colorPalettes[type].find((el) => el.getId() === this._selectedColorPalettes[type]);
        if (!colorPalette) {
            throw new Error("Could not find selected color palette");
        }
        return colorPalette;
    }

    private subscribe(event: WorkbenchSettingsEvents, cb: () => void) {
        const subscribersSet = this._subscribersMap[event] || new Set();
        subscribersSet.add(cb);
        this._subscribersMap[event] = subscribersSet;
        return () => {
            subscribersSet.delete(cb);
        };
    }

    getColorPalettes(): Record<ColorPaletteType, ColorPalette[]> {
        return this._colorPalettes;
    }

    useColorSet(): ColorSet {
        const [colorSet, setColorSet] = React.useState<ColorSet>(
            new ColorSet(this.getSelectedColorPalette(ColorPaletteType.Categorical))
        );

        React.useEffect(() => {
            // Explicitly using arrow function to preserve the "this" context
            const handleColorPalettesChanged = () => {
                setColorSet(new ColorSet(this.getSelectedColorPalette(ColorPaletteType.Categorical)));
            };

            const unsubscribeFunc = this.subscribe(
                WorkbenchSettingsEvents.ColorPalettesChanged,
                handleColorPalettesChanged
            );

            return () => {
                unsubscribeFunc();
            };
        }, []);

        return colorSet;
    }

    useDiscreteColorScale(options: { gradientType: ColorScaleGradientType }): ColorScale {
        const optionsWithDefaults: ColorScaleOptions = {
            type: ColorScaleType.Discrete,
            colorPalette: this.getSelectedColorPalette(
                options.gradientType === ColorScaleGradientType.Sequential
                    ? ColorPaletteType.ContinuousSequential
                    : ColorPaletteType.ContinuousDiverging
            ),
            gradientType: options.gradientType,
            steps: this._steps[
                options.gradientType === ColorScaleGradientType.Sequential
                    ? ColorScaleDiscreteSteps.Sequential
                    : ColorScaleDiscreteSteps.Diverging
            ],
        };

        const divergingSteps = this._steps[ColorScaleDiscreteSteps.Diverging];
        const sequentialSteps = this._steps[ColorScaleDiscreteSteps.Sequential];

        const [adjustedOptions, setAdjustedOptions] = React.useState<ColorScaleOptions>(optionsWithDefaults);

        const [colorScale, setColorScale] = React.useState<ColorScale>(new ColorScale(optionsWithDefaults));

        if (!isEqual(optionsWithDefaults, adjustedOptions)) {
            setAdjustedOptions({ ...optionsWithDefaults });
        }

        React.useEffect(() => {
            // Explicitly using arrow function to preserve the "this" context
            const handleColorPalettesChanged = () => {
                const newColorScale = new ColorScale({
                    ...adjustedOptions,
                    steps:
                        options.gradientType === ColorScaleGradientType.Sequential ? sequentialSteps : divergingSteps,
                    colorPalette: this.getSelectedColorPalette(
                        options.gradientType === ColorScaleGradientType.Sequential
                            ? ColorPaletteType.ContinuousSequential
                            : ColorPaletteType.ContinuousDiverging
                    ),
                });
                setColorScale(newColorScale);
            };

            const unsubscribeFunc = this.subscribe(
                WorkbenchSettingsEvents.ColorPalettesChanged,
                handleColorPalettesChanged
            );

            handleColorPalettesChanged();

            return () => {
                unsubscribeFunc();
            };
        }, [adjustedOptions, divergingSteps, sequentialSteps, options.gradientType]);

        return colorScale;
    }

    useContinuousColorScale(options: { gradientType: ColorScaleGradientType }): ColorScale {
        const optionsWithDefaults: ColorScaleOptions = {
            type: ColorScaleType.Continuous,
            colorPalette: this.getSelectedColorPalette(
                options.gradientType === ColorScaleGradientType.Sequential
                    ? ColorPaletteType.ContinuousSequential
                    : ColorPaletteType.ContinuousDiverging
            ),
            gradientType: options.gradientType,
            steps: this._steps[
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

        React.useEffect(() => {
            // Explicitly using arrow function to preserve the "this" context
            const handleColorPalettesChanged = () => {
                const newColorScale = new ColorScale({
                    ...adjustedOptions,
                    colorPalette: this.getSelectedColorPalette(
                        options.gradientType === ColorScaleGradientType.Sequential
                            ? ColorPaletteType.ContinuousSequential
                            : ColorPaletteType.ContinuousDiverging
                    ),
                });
                setColorScale(newColorScale);
            };

            const unsubscribeFunc = this.subscribe(
                WorkbenchSettingsEvents.ColorPalettesChanged,
                handleColorPalettesChanged
            );

            handleColorPalettesChanged();

            return () => {
                unsubscribeFunc();
            };
        }, [adjustedOptions, options.gradientType]);

        return colorScale;
    }
}
