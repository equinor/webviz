import React from "react";

import { CategoricalColorPalette, ColorPalette, ContinuousColorPalette } from "@lib/utils/ColorPalette";
import { ColorScale, ColorScaleGradientType, ColorScaleOptions, ColorScaleType } from "@lib/utils/ColorScale";
import { ColorSet } from "@lib/utils/ColorSet";

import { isEqual } from "lodash";

export enum ColorPaletteType {
    Categorical = "categorical",
    ContinuousSequential = "continuous-sequential",
    ContinuousDiverging = "continuous-diverging",
}

export enum ColorScaleDiscreteSteps {
    Sequential = "sequential",
    Diverging = "diverging",
}

const defaultCategoricalColorPalettes = [
    new CategoricalColorPalette({
        name: "Retro Metro",
        hexColors: ["#ea5545", "#f46a9b", "#ef9b20", "#edbf33", "#ede15b", "#bdcf32", "#87bc45", "#27aeef", "#b33dc6"],
        id: "retro-metro",
    }),
    new CategoricalColorPalette({
        name: "ResInsight",
        hexColors: [
            "#803E75",
            "#D41C84",
            "#F6768E",
            "#C10020",
            "#7F180D",
            "#F13A13",
            "#FF7A5C",
            "#817066",
            "#FF6800",
            "#593315",
            "#FF8E00",
            "#CEA262",
            "#F4C800",
            "#93AA00",
            "#3B5417",
            "#007D34",
            "#367D7B",
            "#00538A",
            "#A6BDD7",
            "#2E4CE0",
        ],
        id: "resinsight",
    }),
];

const defaultContinuousSequentialColorPalettes = [
    new ContinuousColorPalette({
        name: "Blue to Yellow",
        colors: ["#115f9a", "#1984c5", "#22a7f0", "#48b5c4", "#76c68f", "#a6d75b", "#c9e52f", "#d0ee11", "#f4f100"],
        id: "blue-to-yellow",
    }),
    new ContinuousColorPalette({
        name: "Grey to Red",
        colors: ["#d7e1ee", "#cbd6e4", "#bfcbdb", "#b3bfd1", "#a4a2a8", "#df8879", "#c86558", "#b04238", "#991f17"],
        id: "grey-to-red",
    }),
    new ContinuousColorPalette({
        name: "Black to Pink",
        colors: ["#2e2b28", "#3b3734", "#474440", "#54504c", "#6b506b", "#ab3da9", "#de25da", "#eb44e8", "#ff80ff"],
        id: "black-to-pink",
    }),
    new ContinuousColorPalette({
        name: "Blues",
        colors: ["#0000b3", "#0010d9", "#0020ff", "#0040ff", "#0060ff", "#0080ff", "#009fff", "#00bfff", "#00ffff"],
        id: "blues",
    }),
    new ContinuousColorPalette({
        name: "Yellow to Purple",
        colors: ["#fcfcbe", "#fdc78d", "#fb8d67", "#e45563", "#2c1160", "#6b1f7b", "#2c1160"],
        id: "yellow-to-purple",
    }),
];

const defaultContinuousDivergingColorPalettes = [
    new ContinuousColorPalette({
        name: "Berlin",
        colors: ["#b9c6ff", "#2f799d", "#150e0d", "#944834", "#ffeded"],
        id: "berlin",
    }),
    new ContinuousColorPalette({
        name: "Red to Blue",
        colors: ["#b2182b", "#ef8a62", "#fddbc7", "#f8f6e9", "#d1e5f0", "#67a9cf", "#2166ac"],
        id: "red-to-blue",
    }),
    new ContinuousColorPalette({
        name: "Orange to Purple",
        colors: ["#ffb400", "#d2980d", "#a57c1b", "#786028", "#363445", "#48446e", "#5e569b", "#776bcd", "#9080ff"],
        id: "orange-to-purple",
    }),
    new ContinuousColorPalette({
        name: "Pink Foam",
        colors: ["#54bebe", "#76c8c8", "#98d1d1", "#badbdb", "#dedad2", "#e4bcad", "#df979e", "#d7658b", "#c80064"],
        id: "pink-foam",
    }),
    new ContinuousColorPalette({
        name: "Salmon to Aqua",
        colors: ["#e27c7c", "#a86464", "#6d4b4b", "#503f3f", "#333333", "#3c4e4b", "#466964", "#599e94", "#6cd4c5"],
        id: "salmon-to-aqua",
    }),
];

export enum WorkbenchSettingsEvents {
    ColorPalettesChanged = "ColorPalettesChanged",
}

export class WorkbenchSettings {
    private _colorPalettes: Record<ColorPaletteType, ColorPalette[]>;
    private _selectedColorPalettes: Record<ColorPaletteType, string>;
    private _steps: {
        [ColorScaleDiscreteSteps.Sequential]: number;
        [ColorScaleDiscreteSteps.Diverging]: number;
    };
    private _subscribersMap: { [key: string]: Set<() => void> };

    constructor() {
        this._subscribersMap = {};

        this._colorPalettes = {
            [ColorPaletteType.Categorical]: defaultCategoricalColorPalettes,
            [ColorPaletteType.ContinuousSequential]: defaultContinuousSequentialColorPalettes,
            [ColorPaletteType.ContinuousDiverging]: defaultContinuousDivergingColorPalettes,
        };
        this._selectedColorPalettes = {
            [ColorPaletteType.Categorical]: defaultCategoricalColorPalettes[0].getId(),
            [ColorPaletteType.ContinuousSequential]: defaultContinuousSequentialColorPalettes[0].getId(),
            [ColorPaletteType.ContinuousDiverging]: defaultContinuousDivergingColorPalettes[0].getId(),
        };

        this._steps = {
            [ColorScaleDiscreteSteps.Sequential]: 10,
            [ColorScaleDiscreteSteps.Diverging]: 10,
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
            if (
                selectedColorPalettes[key] &&
                this._colorPalettes[key as ColorPaletteType].find((el) => el.getId() === selectedColorPalettes[key])
            ) {
                this._selectedColorPalettes[key as ColorPaletteType] = selectedColorPalettes[key];
            }
        }

        this.notifySubscribers(WorkbenchSettingsEvents.ColorPalettesChanged);
    }

    private loadStepsFromLocalStorage(): void {
        const stepsString = localStorage.getItem("discreteColorScaleSteps");
        if (!stepsString) {
            return;
        }

        const steps = JSON.parse(stepsString);
        if (!steps) return;

        this._steps = steps;

        this.notifySubscribers(WorkbenchSettingsEvents.ColorPalettesChanged);
    }

    private storeSelectedColorPalettesIdsToLocalStorage(): void {
        localStorage.setItem("selectedColorPalettes", JSON.stringify(this._selectedColorPalettes));
    }

    private storeStepsToLocalStorage(): void {
        localStorage.setItem("discreteColorScaleSteps", JSON.stringify(this._steps));
    }

    private notifySubscribers(event: WorkbenchSettingsEvents): void {
        const subscribers = this._subscribersMap[event];
        if (!subscribers) return;

        subscribers.forEach((subscriber) => {
            subscriber();
        });
    }

    subscribe(event: WorkbenchSettingsEvents, cb: () => void) {
        const subscribersSet = this._subscribersMap[event] || new Set();
        subscribersSet.add(cb);
        this._subscribersMap[event] = subscribersSet;
        return () => {
            subscribersSet.delete(cb);
        };
    }

    getColorPalettes(): { [key: string]: ColorPalette[] } {
        return this._colorPalettes;
    }

    getSelectedColorPaletteId(type: ColorPaletteType): string {
        return this._selectedColorPalettes[type];
    }

    getSelectedColorPalette(type: ColorPaletteType): ColorPalette {
        const colorPalette = this._colorPalettes[type].find((el) => el.getId() === this._selectedColorPalettes[type]);
        if (!colorPalette) {
            throw new Error("Could not find selected color palette");
        }
        return colorPalette;
    }

    getSelectedColorPaletteIds(): Record<ColorPaletteType, string> {
        return this._selectedColorPalettes;
    }

    setSelectedColorPaletteId(type: ColorPaletteType, id: string): void {
        this._selectedColorPalettes[type] = id;
        this.storeSelectedColorPalettesIdsToLocalStorage();
        this.notifySubscribers(WorkbenchSettingsEvents.ColorPalettesChanged);
    }

    getSteps(): {
        [ColorScaleDiscreteSteps.Sequential]: number;
        [ColorScaleDiscreteSteps.Diverging]: number;
    } {
        return this._steps;
    }

    setSteps(steps: {
        [ColorScaleDiscreteSteps.Sequential]: number;
        [ColorScaleDiscreteSteps.Diverging]: number;
    }): void {
        this._steps = steps;
        this.storeStepsToLocalStorage();
        this.notifySubscribers(WorkbenchSettingsEvents.ColorPalettesChanged);
    }

    getStepsForType(type: ColorScaleDiscreteSteps.Diverging | ColorScaleDiscreteSteps.Sequential): number {
        return this._steps[type];
    }

    setStepsForType(type: ColorScaleDiscreteSteps.Diverging | ColorScaleDiscreteSteps.Sequential, steps: number): void {
        this._steps[type] = steps;
        this.storeStepsToLocalStorage();
        this.notifySubscribers(WorkbenchSettingsEvents.ColorPalettesChanged);
    }

    useColorSet(): ColorSet {
        const [colorSet, setColorSet] = React.useState<ColorSet>(
            new ColorSet(this.getSelectedColorPalette(ColorPaletteType.Categorical) as CategoricalColorPalette)
        );

        React.useEffect(() => {
            // Explicitly using arrow function to preserve the "this" context
            const handleColorPalettesChanged = () => {
                setColorSet(
                    new ColorSet(this.getSelectedColorPalette(ColorPaletteType.Categorical) as CategoricalColorPalette)
                );
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
            ) as ContinuousColorPalette,
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
                    steps: this._steps[
                        options.gradientType === ColorScaleGradientType.Sequential
                            ? ColorScaleDiscreteSteps.Sequential
                            : ColorScaleDiscreteSteps.Diverging
                    ],
                    colorPalette: this.getSelectedColorPalette(
                        options.gradientType === ColorScaleGradientType.Sequential
                            ? ColorPaletteType.ContinuousSequential
                            : ColorPaletteType.ContinuousDiverging
                    ) as ContinuousColorPalette,
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
        }, [adjustedOptions]);

        return colorScale;
    }

    useContinuousColorScale(options: { gradientType: ColorScaleGradientType }): ColorScale {
        const optionsWithDefaults: ColorScaleOptions = {
            type: ColorScaleType.Continuous,
            colorPalette: this.getSelectedColorPalette(
                options.gradientType === ColorScaleGradientType.Sequential
                    ? ColorPaletteType.ContinuousSequential
                    : ColorPaletteType.ContinuousDiverging
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
                            ? ColorPaletteType.ContinuousSequential
                            : ColorPaletteType.ContinuousDiverging
                    ) as ContinuousColorPalette,
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
        }, [adjustedOptions]);

        return colorScale;
    }
}
