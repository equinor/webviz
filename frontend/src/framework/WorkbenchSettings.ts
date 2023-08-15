import React from "react";

import { CategoricalColorPalette, ColorPalette, ContinuousColorPalette } from "@lib/utils/ColorPalette";
import { ColorScale, ColorScaleGradientType, ColorScaleOptions, ColorScaleType } from "@lib/utils/ColorScale";
import { ColorSet } from "@lib/utils/ColorSet";

import { isEqual } from "lodash";

import { Workbench, WorkbenchEvents } from "./Workbench";

export enum ColorType {
    Categorical = "categorical",
    ContinuousSequential = "continuous-sequential",
    ContinuousDiverging = "continuous-diverging",
    DiscreteSequential = "discrete-sequential",
    DiscreteDiverging = "discrete-diverging",
}

const defaultCategoricalColorPalette = new CategoricalColorPalette(
    "Default",
    ["#ea5545", "#f46a9b", "#ef9b20", "#edbf33", "#ede15b", "#bdcf32", "#87bc45", "#27aeef", "#b33dc6"],
    "Default"
);

const defaultContinuousSequentialColorPalette = new ContinuousColorPalette(
    "Default",
    [
        {
            hexColor: "#115f9a",
            position: 0,
            midPointPosition: 0.5,
        },
        {
            hexColor: "#1984c5",
            position: 0.125,
            midPointPosition: 0.5,
        },
        {
            hexColor: "#22a7f0",
            position: 0.25,
            midPointPosition: 0.5,
        },
        {
            hexColor: "#48b5c4",
            position: 0.375,
            midPointPosition: 0.5,
        },
        {
            hexColor: "#76c68f",
            position: 0.5,
            midPointPosition: 0.5,
        },
        {
            hexColor: "#a6d75b",
            position: 0.625,
            midPointPosition: 0.5,
        },
        {
            hexColor: "#c9e52f",
            position: 0.75,
            midPointPosition: 0.5,
        },
        {
            hexColor: "#d0ee11",
            position: 0.875,
            midPointPosition: 0.5,
        },
        {
            hexColor: "#d0f400",
            position: 1,
            midPointPosition: 0.5,
        },
    ],
    "Default"
);

const defaultContinuousDivergingColorPalette = new ContinuousColorPalette(
    "Berlin",
    [
        {
            hexColor: "#b9c6ff",
            position: 0,
            midPointPosition: 0.5,
        },
        {
            hexColor: "#2f799d",
            position: 0.25,
            midPointPosition: 0.5,
        },
        {
            hexColor: "#150e0d",
            position: 0.5,
            midPointPosition: 0.5,
        },
        {
            hexColor: "#944834",
            position: 0.75,
            midPointPosition: 0.5,
        },
        {
            hexColor: "#ffeded",
            position: 1,
            midPointPosition: 0.5,
        },
    ],
    "Default"
);

export class WorkbenchSettings {
    private _workbench: Workbench;
    private _colorPalettes: { [key: string]: ColorPalette[] };
    private _selectedColorPalettes: Record<ColorType, string>;
    private _steps: {
        [ColorType.DiscreteSequential]: number;
        [ColorType.DiscreteDiverging]: number;
    };

    constructor(workbench: Workbench) {
        this._workbench = workbench;

        this._colorPalettes = {
            [ColorType.Categorical]: [defaultCategoricalColorPalette],
            [ColorType.ContinuousSequential]: [defaultContinuousSequentialColorPalette],
            [ColorType.ContinuousDiverging]: [defaultContinuousDivergingColorPalette],
        };
        this._selectedColorPalettes = {
            [ColorType.Categorical]: defaultCategoricalColorPalette.getId(),
            [ColorType.ContinuousSequential]: defaultContinuousSequentialColorPalette.getId(),
            [ColorType.ContinuousDiverging]: defaultContinuousDivergingColorPalette.getId(),
            [ColorType.DiscreteSequential]: defaultContinuousSequentialColorPalette.getId(),
            [ColorType.DiscreteDiverging]: defaultContinuousDivergingColorPalette.getId(),
        };

        this._steps = {
            [ColorType.DiscreteSequential]: 10,
            [ColorType.DiscreteDiverging]: 10,
        };

        this.loadSelectedColorPalettesIdsFromLocalStorage();
        this.loadStepsFromLocalStorage();
    }

    private loadSelectedColorPalettesIdsFromLocalStorage(): void {
        const selectedColorPalettesString = localStorage.getItem("selectedColorPalettes");
        if (!selectedColorPalettesString) {
            return;
        }

        const selectedColorPalettes = JSON.parse(selectedColorPalettesString);
        if (!selectedColorPalettes) return;

        for (const key of Object.keys(this._selectedColorPalettes)) {
            if (selectedColorPalettes[key]) {
                this._selectedColorPalettes[key as ColorType] = selectedColorPalettes[key];
            }
        }
    }

    private loadStepsFromLocalStorage(): void {
        const stepsString = localStorage.getItem("discreteColorScaleSteps");
        if (!stepsString) {
            return;
        }

        const steps = JSON.parse(stepsString);
        if (!steps) return;

        for (const key of Object.keys(this._steps)) {
            if (steps[key]) {
                this._selectedColorPalettes[key as ColorType] = steps[key];
            }
        }
    }

    private storeSelectedColorPalettesIdsToLocalStorage(): void {
        localStorage.setItem("selectedColorPalettes", JSON.stringify(this._selectedColorPalettes));
    }

    private storeStepsToLocalStorage(): void {
        localStorage.setItem("discreteColorScaleSteps", JSON.stringify(this._steps));
    }

    getColorPalettes(): { [key: string]: ColorPalette[] } {
        return this._colorPalettes;
    }

    getSelectedColorPaletteId(type: ColorType): string {
        return this._selectedColorPalettes[type];
    }

    getSelectedColorPalette(type: ColorType): ColorPalette {
        const colorPalette = this._colorPalettes[type].find((el) => el.getId() === this._selectedColorPalettes[type]);
        if (!colorPalette) {
            throw new Error("Could not find selected color palette");
        }
        return colorPalette;
    }

    getSelectedColorPaletteIds(): Record<ColorType, string> {
        return this._selectedColorPalettes;
    }

    setSelectedColorPaletteId(type: ColorType, id: string): void {
        this._selectedColorPalettes[type] = id;
        this.storeSelectedColorPalettesIdsToLocalStorage();
    }

    getSteps(): {
        [ColorType.DiscreteSequential]: number;
        [ColorType.DiscreteDiverging]: number;
    } {
        return this._steps;
    }

    setSteps(steps: { [ColorType.DiscreteSequential]: number; [ColorType.DiscreteDiverging]: number }): void {
        this._steps = steps;
        this.storeStepsToLocalStorage();
    }

    getStepsForType(type: ColorType.DiscreteDiverging | ColorType.DiscreteSequential): number {
        return this._steps[type];
    }

    setStepsForType(type: ColorType.DiscreteDiverging | ColorType.DiscreteSequential, steps: number): void {
        this._steps[type] = steps;
        this.storeStepsToLocalStorage();
    }

    useColorSet(): ColorSet {
        const [colorSet, setColorSet] = React.useState<ColorSet>(
            new ColorSet(this.getSelectedColorPalette(ColorType.Categorical) as CategoricalColorPalette)
        );

        React.useEffect(() => {
            // Explicitly using arrow function to preserve the "this" context
            const handleColorPalettesChanged = () => {
                setColorSet(
                    new ColorSet(this.getSelectedColorPalette(ColorType.Categorical) as CategoricalColorPalette)
                );
            };

            const unsubscribeFunc = this._workbench.subscribe(
                WorkbenchEvents.ColorPalettesChanged,
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
                    ? ColorType.DiscreteSequential
                    : ColorType.DiscreteDiverging
            ) as ContinuousColorPalette,
            gradientType: options.gradientType,
            steps: this._steps[
                options.gradientType === ColorScaleGradientType.Sequential
                    ? ColorType.DiscreteSequential
                    : ColorType.DiscreteDiverging
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
                            ? ColorType.ContinuousSequential
                            : ColorType.ContinuousDiverging
                    ) as ContinuousColorPalette,
                });
                setColorScale(newColorScale);
            };

            const unsubscribeFunc = this._workbench.subscribe(
                WorkbenchEvents.ColorPalettesChanged,
                handleColorPalettesChanged
            );

            handleColorPalettesChanged();

            return () => {
                unsubscribeFunc();
            };
        }, [adjustedOptions]);

        return colorScale;
    }

    useContinuousColorScale(options: { gradientType: ColorScaleGradientType }): ColorScale {
        const optionsWithDefaults: ColorScaleOptions = {
            type: ColorScaleType.Continuous,
            colorPalette: this.getSelectedColorPalette(
                options.gradientType === ColorScaleGradientType.Sequential
                    ? ColorType.ContinuousSequential
                    : ColorType.ContinuousDiverging
            ) as ContinuousColorPalette,
            gradientType: options.gradientType,
            steps: 0,
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
                            ? ColorType.ContinuousSequential
                            : ColorType.ContinuousDiverging
                    ) as ContinuousColorPalette,
                });
                setColorScale(newColorScale);
            };

            const unsubscribeFunc = this._workbench.subscribe(
                WorkbenchEvents.ColorPalettesChanged,
                handleColorPalettesChanged
            );

            handleColorPalettesChanged();

            return () => {
                unsubscribeFunc();
            };
        }, [adjustedOptions]);

        return colorScale;
    }
}
