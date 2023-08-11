import React from "react";

import {
    CategoricalColor,
    CategoricalColorPalette,
    ContinuousColorPalette,
    convertHexToHsv,
    convertHsvToHex,
    interpolateHsv,
} from "@lib/utils/ColorPalette";

import { isEqual } from "lodash";

import { ColorType, Workbench, WorkbenchEvents } from "./Workbench";

export enum ColorScaleType {
    Discrete,
    Continuous,
}

export enum ColorScaleGradientType {
    Sequential,
    Diverging,
}

export enum ColorScaleScaleType {
    Linear,
    Logarithmic,
    Exponential,
}

export enum ColorScaleContinuousInterpolationType {
    Linear = "linear",
    NaturalBreaks = "natural",
    Median = "median",
    Quartiles = "quartiles",
    Quintiles = "quintiles",
    Deciles = "deciles",
}

export enum ColorScaleDiscreteInterpolationType {
    Linear = "linear",
    RoundedValues = "rounded values",
    Quantile = "quantile",
    NaturalBreaks = "natural breaks",
}

export const ColorScaleContinuousInterpolationTypeOptions = {
    [ColorScaleContinuousInterpolationType.Linear]: "Linear",
    [ColorScaleContinuousInterpolationType.NaturalBreaks]: "Natural Breaks (Jenks)",
    [ColorScaleContinuousInterpolationType.Median]: "Median",
    [ColorScaleContinuousInterpolationType.Quartiles]: "Quartiles",
    [ColorScaleContinuousInterpolationType.Quintiles]: "Quintiles",
    [ColorScaleContinuousInterpolationType.Deciles]: "Deciles",
};

export const ColorScaleDiscreteInterpolationTypeOptions = {
    [ColorScaleDiscreteInterpolationType.Linear]: "Linear",
    [ColorScaleDiscreteInterpolationType.RoundedValues]: "Rounded values",
    [ColorScaleDiscreteInterpolationType.Quantile]: "Quantile (equal count)",
    [ColorScaleDiscreteInterpolationType.NaturalBreaks]: "Natural Breaks (Jenks)",
};

export type ColorScaleOptions = {
    colorPalette: ContinuousColorPalette;
    scaleType: ColorScaleScaleType;
} & (
    | {
          gradientType: ColorScaleGradientType.Sequential;
          divMidPoint?: never;
      }
    | {
          gradientType: ColorScaleGradientType.Diverging;
          divMidPoint?: number;
      }
) &
    (
        | ({
              type: ColorScaleType.Discrete;
              steps: number;
          } & {
              interpolation:
                  | ColorScaleDiscreteInterpolationType.Linear
                  | ColorScaleDiscreteInterpolationType.RoundedValues
                  | ColorScaleDiscreteInterpolationType.Quantile
                  | ColorScaleDiscreteInterpolationType.NaturalBreaks;
              data?: number[];
          })
        | ({
              type: ColorScaleType.Continuous;
              steps?: never;
          } & {
              interpolation:
                  | ColorScaleContinuousInterpolationType.Linear
                  | ColorScaleContinuousInterpolationType.Median
                  | ColorScaleContinuousInterpolationType.Quartiles
                  | ColorScaleContinuousInterpolationType.Quintiles
                  | ColorScaleContinuousInterpolationType.Deciles
                  | ColorScaleContinuousInterpolationType.NaturalBreaks;
              data?: number[];
          })
    );

export class ColorScale {
    private _colorPalette: ContinuousColorPalette;
    private _min: number;
    private _max: number;
    private _type: ColorScaleType;
    private _gradientType: ColorScaleGradientType;
    private _scaleType: ColorScaleScaleType;
    private _divMidPoint: number;
    private _interpolationType: ColorScaleContinuousInterpolationType | ColorScaleDiscreteInterpolationType;
    private _data: number[] | null;
    private _valueColorsMap: [number, string][] | null;
    private _valueGradientPositionMap: number[][] | null;
    private _steps: number | null;

    constructor(options: ColorScaleOptions) {
        this._colorPalette = options.colorPalette;
        this._min = 0;
        this._max = 1;
        this._type = options.type;
        this._gradientType = options.gradientType;
        this._scaleType = options.scaleType;
        this._divMidPoint = options.divMidPoint || 0;
        this._interpolationType = options.interpolation;
        this._data = options.data || null;
        this._valueColorsMap = null;
        this._valueGradientPositionMap = null;
        this._steps = options.steps || null;

        if (this._interpolationType !== ColorScaleContinuousInterpolationType.Linear) {
            this.sortData();
        }

        if (this._data && this._data.length > 0) {
            this._min = Math.min(...this._data);
            this._max = Math.max(...this._data);
        }

        if (this._data && this._data.length > 0) {
            switch (this._interpolationType) {
                case ColorScaleDiscreteInterpolationType.Quantile:
                    if (!this._steps) {
                        throw new Error("Quantile interpolation requires steps to be set");
                    }
                    this._valueColorsMap = this.calcPercentileColors(this._data, this._steps);
                    break;
                case ColorScaleContinuousInterpolationType.Quartiles:
                    this._valueGradientPositionMap = this.calcPercentileGradientPositions(this._data, 4);
                    break;
                case ColorScaleContinuousInterpolationType.Quintiles:
                    this._valueGradientPositionMap = this.calcPercentileGradientPositions(this._data, 5);
                    break;
                case ColorScaleContinuousInterpolationType.Deciles:
                    this._valueGradientPositionMap = this.calcPercentileGradientPositions(this._data, 10);
                    break;
                case ColorScaleContinuousInterpolationType.NaturalBreaks:
                    this._valueGradientPositionMap = this.calcNaturalBreaksGradientPositions(this._data, 5);
                    break;
                case ColorScaleDiscreteInterpolationType.NaturalBreaks:
                    if (!this._steps) {
                        throw new Error("Natural breaks interpolation requires steps to be set");
                    } else {
                        this._valueColorsMap = this.calcNaturalBreakColors(this._data, this._steps);
                    }
                    break;
                case ColorScaleContinuousInterpolationType.Median:
                    this._valueGradientPositionMap = this.calcPercentileGradientPositions(this._data, 2);
                    break;
            }
        }

        if (
            this._type === ColorScaleType.Discrete &&
            this._interpolationType === ColorScaleDiscreteInterpolationType.Linear
        ) {
            if (!this._steps) {
                throw new Error("Quantile interpolation requires steps to be set");
            }
            this._valueColorsMap = this.calcLinearColors(this._steps);
        }
    }

    private sortData(): void {
        if (this._data) {
            this._data.sort((a, b) => a - b);
        }
    }

    private calcLinearColors(steps: number): [number, string][] {
        const values: [number, string][] = [];
        const colors = this.sampleColors(steps);

        for (let i = 1; i <= steps; i++) {
            const value = this._min + ((this._max - this._min) / steps) * i;
            values.push([value, colors[i - 1]]);
        }

        return values;
    }

    private calcPercentileGradientPositions(data: number[], numPercentiles: number): number[][] {
        const values: number[][] = [];

        for (let i = 1; i <= numPercentiles; i++) {
            const index = Math.floor((data.length * i) / numPercentiles - 1);
            values.push([data[index], (1 / numPercentiles) * i]);
        }

        return values;
    }

    private calcNaturalBreaksGradientPositions(data: number[], numBreaks: number): number[][] {
        const values: number[][] = [];
        const breaks = this.calcNaturalBreaks(data, numBreaks);

        for (let i = 0; i < breaks.length; i++) {
            values.push([breaks[i], (1 / numBreaks) * i]);
        }

        return values;
    }

    private calcNaturalBreakColors(data: number[], numBreaks: number): [number, string][] {
        const values: [number, string][] = [];
        const colors = this.sampleColors(numBreaks);

        const breaks = this.calcNaturalBreaks(data, numBreaks);

        for (let i = 1; i < breaks.length; i++) {
            values.push([breaks[i], colors[i - 1]]);
        }

        return values;
    }

    private calcPercentileColors(data: number[], numPercentiles: number): [number, string][] {
        const colors = this.sampleColors(numPercentiles);
        const valueColorsMap: [number, string][] = [];

        for (let i = 0; i < numPercentiles; i++) {
            const index = Math.floor(((data.length - 1) * (i + 1)) / numPercentiles);
            valueColorsMap.push([data[index], colors[i]]);
        }

        return valueColorsMap;
    }

    private calcNaturalBreaks(data: number[], numBreaks: number): number[] {
        /*
         * Implementation of Jenks natural breaks algorithm in JavaScript,
         * ported from Tom MacWright's Gist:
         *
         * https://gist.github.com/tmcw/4977508
         *
         */

        function getMatrices(
            data: number[],
            numBreaks: number
        ): { lowerClassLimits: number[][]; varianceCombinations: number[][] } {
            const lowerClassLimits: number[][] = [];
            const varianceCombinations: number[][] = [];
            let variance = 0;

            for (let i = 0; i < data.length + 1; i++) {
                const temp1: number[] = [];
                const temp2: number[] = [];

                for (let j = 0; j < numBreaks + 1; j++) {
                    temp1.push(0);
                    temp2.push(0);
                }

                lowerClassLimits.push(temp1);
                varianceCombinations.push(temp2);
            }

            for (let i = 1; i < numBreaks + 1; i++) {
                lowerClassLimits[1][i] = 1;
                varianceCombinations[1][i] = 0;

                for (let j = 2; j < data.length + 1; j++) {
                    varianceCombinations[j][i] = Infinity;
                }
            }

            for (let l = 2; l < data.length + 1; l++) {
                let sum = 0;
                let sumSquares = 0;
                let w = 0;
                let i4 = 0;

                for (let m = 1; m < l + 1; m++) {
                    const lowerClassLimit = l - m + 1;
                    const val = data[lowerClassLimit - 1];

                    w++;

                    sum += val;
                    sumSquares += val * val;

                    variance = sumSquares - (sum * sum) / w;

                    i4 = lowerClassLimit - 1;

                    if (i4 !== 0) {
                        for (let j = 2; j < numBreaks + 1; j++) {
                            if (varianceCombinations[l][j] >= variance + varianceCombinations[i4][j - 1]) {
                                lowerClassLimits[l][j] = lowerClassLimit;
                                varianceCombinations[l][j] = variance + varianceCombinations[i4][j - 1];
                            }
                        }
                    }
                }

                lowerClassLimits[l][1] = 1;
                varianceCombinations[l][1] = variance;
            }

            return { lowerClassLimits, varianceCombinations };
        }

        function breaks(data: number[], lowerClassLimits: number[][], numBreaks: number): number[] {
            let k = data.length - 1;
            const kClass: number[] = [];

            kClass[numBreaks] = data[k];
            kClass[0] = data[0];

            for (let i = numBreaks; i > 1; i--) {
                kClass[i - 1] = data[lowerClassLimits[k][i] - 2];
                k = lowerClassLimits[k][i] - 1;
            }

            return kClass;
        }

        if (numBreaks > data.length) {
            throw new Error("Invalid number of breaks");
        }

        const matrices = getMatrices(data, numBreaks);
        const lowerClassLimits = matrices.lowerClassLimits;

        const breaksArray = breaks(data, lowerClassLimits, numBreaks);
        return breaksArray;
    }

    private calcNormalizedValue(value: number, min: number, max: number): number {
        let normalizedValue = 0;
        if (this._gradientType === ColorScaleGradientType.Sequential) {
            switch (this._scaleType) {
                case ColorScaleScaleType.Linear:
                    normalizedValue = (value - min) / (max - min);
                    break;
                case ColorScaleScaleType.Logarithmic:
                    normalizedValue = Math.log10(value - min) / Math.log10(max - min);
                    break;
                case ColorScaleScaleType.Exponential:
                    normalizedValue = Math.pow(value - min, 2) / Math.pow(max - min, 2);
                    break;
            }
        } else if (this._gradientType === ColorScaleGradientType.Diverging) {
            switch (this._scaleType) {
                case ColorScaleScaleType.Linear:
                    if (value < this._divMidPoint) {
                        normalizedValue = ((value - min) / (this._divMidPoint - min)) * 0.5;
                    } else {
                        normalizedValue = 0.5 * (1 + (value - this._divMidPoint) / (max - this._divMidPoint));
                    }
                    break;
                case ColorScaleScaleType.Logarithmic:
                    if (value < this._divMidPoint) {
                        normalizedValue = (Math.log10(value - min) / Math.log10(this._divMidPoint - min)) * 0.5;
                    } else {
                        normalizedValue =
                            0.5 * (1 + Math.log10(value - this._divMidPoint) / Math.log10(max - this._divMidPoint));
                    }
                    break;
                case ColorScaleScaleType.Exponential:
                    if (value < this._divMidPoint) {
                        normalizedValue = (Math.pow(value - min, 2) / Math.pow(this._divMidPoint - min, 2)) * 0.5;
                    } else {
                        normalizedValue =
                            0.5 * (1 + Math.pow(value - this._divMidPoint, 2) / Math.pow(max - this._divMidPoint, 2));
                    }
                    break;
            }
        }

        return normalizedValue;
    }

    getColorForValue(value: number): string {
        if (value < this._min || value > this._max) {
            return this.getColorOutOfScope(value);
        }

        let color = "";

        if (this._type === ColorScaleType.Discrete) {
            if (this._valueColorsMap) {
                for (let i = 0; i < this._valueColorsMap.length; i++) {
                    if (value <= this._valueColorsMap[i][0]) {
                        color = this._valueColorsMap[i][1];
                        break;
                    }
                }
            }
        } else {
            if (!this._valueGradientPositionMap) {
                const normalizedValue = this.calcNormalizedValue(value, this._min, this._max);
                color = this._colorPalette.getColorAtPosition(normalizedValue);
            } else {
                for (let i = 0; i <= this._valueGradientPositionMap.length; i++) {
                    if (value <= this._valueGradientPositionMap[i][0]) {
                        const minValue =
                            i > 0 ? this._valueGradientPositionMap.at(i - 1)?.at(0) ?? this._min : this._min;
                        const maxValue = this._valueGradientPositionMap.at(i)?.at(0) ?? this._max;
                        const minPosition = i > 0 ? this._valueGradientPositionMap.at(i - 1)?.at(1) ?? 0 : 0;
                        const maxPosition = this._valueGradientPositionMap.at(i)?.at(1) ?? 1;
                        const normalizedValue = this.calcNormalizedValue(value, minValue, maxValue);
                        color = this._colorPalette.getColorAtPosition(
                            minPosition + normalizedValue * (maxPosition - minPosition)
                        );
                        break;
                    }
                }
            }
        }

        return color;
    }

    sampleColors(numSamples: number): string[] {
        const colors: string[] = [];
        for (let i = 0; i < numSamples; i++) {
            const startPos = i / numSamples;
            const endPos = (i + 1) / numSamples;
            colors.push(this._colorPalette.getColorAtPosition(startPos + (endPos - startPos) / 2));
        }
        return colors;
    }

    getMin(): number {
        return this._min;
    }

    getMax(): number {
        return this._max;
    }

    setMin(value: number) {
        this._min = value;
    }

    setMax(value: number) {
        this._max = value;
    }

    setScaleType(scaleType: ColorScaleScaleType) {
        this._scaleType = scaleType;
    }

    getScaleType(): ColorScaleScaleType {
        return this._scaleType;
    }

    setDivMidPoint(value: number) {
        this._divMidPoint = value;
    }

    getDivMidPoint(): number {
        return this._divMidPoint;
    }

    getAsPlotlyColorScale(): Array<[number, string]> {
        const plotlyColorScale: Array<[number, string]> = [];
        for (let i = 0; i <= 100; i++) {
            plotlyColorScale.push([i / 100, this.getColorForValue(this._min + (this._max - this._min) * (i / 100))]);
        }
        return plotlyColorScale;
    }

    private getColorOutOfScope(value: number): string {
        const minColor = this._colorPalette.getColorAtPosition(0);
        const maxColor = this._colorPalette.getColorAtPosition(1);
        const midColor = this._colorPalette.getColorAtPosition(0.5);

        const minHsv = convertHexToHsv(minColor);
        const maxHsv = convertHexToHsv(maxColor);
        const midHsv = convertHexToHsv(midColor);

        const hueDiff = Math.abs(maxHsv.h - minHsv.h);
        const deltaHue = hueDiff / 2;

        let newMinHue = minHsv.h;
        let newMaxHue = maxHsv.h;

        if (minHsv.h < midHsv.h) {
            newMinHue = minHsv.h - deltaHue;
        } else {
            newMinHue = minHsv.h + deltaHue;
        }

        if (maxHsv.h > midHsv.h) {
            newMaxHue = maxHsv.h + deltaHue;
        } else {
            newMaxHue = maxHsv.h - deltaHue;
        }

        console.info("newMinColor: " + convertHsvToHex({ h: newMinHue, s: minHsv.s, v: minHsv.v }));
        console.info("newMaxColor: " + convertHsvToHex({ h: newMaxHue, s: maxHsv.s, v: maxHsv.v }));

        const newExpMin = this._min - Math.abs(this._max - this._min) ** 2;
        const newExpMax = this._max + Math.abs(this._max - this._min) ** 2;

        if (value < this._min) {
            const quotient = Math.log10(value - this._min) / Math.log10(newExpMin - this._min);
            const newHsv = interpolateHsv({ h: newMinHue, s: minHsv.s, v: minHsv.v }, minHsv, quotient);
            return convertHsvToHex(newHsv);
        } else {
            const quotient = Math.log10(value - this._max) / Math.log10(newExpMax - this._max);
            const newHsv = interpolateHsv(maxHsv, { h: newMaxHue, s: maxHsv.s, v: maxHsv.v }, quotient);
            return convertHsvToHex(newHsv);
        }
    }
}

export class ColorSet {
    private _colorPalette: CategoricalColorPalette;
    private _runningIndex: number;

    constructor(colorPalette: CategoricalColorPalette) {
        this._colorPalette = colorPalette;
        this._runningIndex = 0;
    }

    getColorArray(): string[] {
        return this._colorPalette.getColors().map((color: CategoricalColor) => color.hexColor);
    }

    getColor(index: number): string {
        if (index < 0 || index >= this._colorPalette.getColors().length) {
            throw new Error(`Color index ${index} is out of bounds`);
        }
        return this._colorPalette.getColors()[index].hexColor;
    }

    /**
     *
     * @returns The first color in the palette, and resets the running index to 0
     */
    getFirstColor(): string {
        this._runningIndex = Math.min(1, this._colorPalette.getColors().length - 1);
        return this._colorPalette.getColors()[0].hexColor;
    }

    /**
     *
     * @returns The next color in the palette, and increments the running index
     *
     * If the running index is at the end of the palette, it wraps around to the beginning
     *
     * If the palette is empty, it returns "#000000".
     *
     */
    getNextColor(): string {
        if (this._colorPalette.getColors().length === 0) {
            return "#000000";
        }
        const color = this._colorPalette.getColors()[this._runningIndex].hexColor;
        this._runningIndex = (this._runningIndex + 1) % this._colorPalette.getColors().length;
        return color;
    }
}

export class WorkbenchSettings {
    private _workbench: Workbench;

    constructor(workbench: Workbench) {
        this._workbench = workbench;
    }

    useColorSet(): ColorSet {
        const [colorSet, setColorSet] = React.useState<ColorSet>(
            new ColorSet(this._workbench.getSelectedColorPalette(ColorType.Categorical) as CategoricalColorPalette)
        );

        React.useEffect(() => {
            // Explicitly using arrow function to preserve the "this" context
            const handleColorPalettesChanged = () => {
                setColorSet(
                    new ColorSet(
                        this._workbench.getSelectedColorPalette(ColorType.Categorical) as CategoricalColorPalette
                    )
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

    useDiscreteSequentialColorScale(options?: {
        steps: number;
        scaleType?: ColorScaleScaleType;
        interpolation?:
            | ColorScaleDiscreteInterpolationType.Linear
            | ColorScaleDiscreteInterpolationType.RoundedValues
            | ColorScaleDiscreteInterpolationType.Quantile
            | ColorScaleDiscreteInterpolationType.NaturalBreaks;
        data?: number[];
    }): ColorScale {
        const optionsWithDefaults: ColorScaleOptions = {
            type: ColorScaleType.Discrete,
            steps: options?.steps ?? 5,
            colorPalette: this._workbench.getSelectedColorPalette(ColorType.Sequential) as ContinuousColorPalette,
            gradientType: ColorScaleGradientType.Sequential,
            scaleType: options?.scaleType ?? ColorScaleScaleType.Linear,
            interpolation: options?.interpolation ?? ColorScaleDiscreteInterpolationType.Linear,
            data: options?.data,
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
                    colorPalette: this._workbench.getSelectedColorPalette(
                        ColorType.Sequential
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

    useDiscreteDivergingColorScale(options?: {
        steps: number;
        scaleType?: ColorScaleScaleType;
        interpolation?:
            | ColorScaleDiscreteInterpolationType.Linear
            | ColorScaleDiscreteInterpolationType.RoundedValues
            | ColorScaleDiscreteInterpolationType.Quantile
            | ColorScaleDiscreteInterpolationType.NaturalBreaks;
        data?: number[];
        divMidPoint?: number;
    }): ColorScale {
        const optionsWithDefaults: ColorScaleOptions = {
            type: ColorScaleType.Discrete,
            steps: options?.steps ?? 5,
            colorPalette: this._workbench.getSelectedColorPalette(ColorType.Diverging) as ContinuousColorPalette,
            gradientType: ColorScaleGradientType.Diverging,
            scaleType: options?.scaleType ?? ColorScaleScaleType.Linear,
            interpolation: options?.interpolation ?? ColorScaleDiscreteInterpolationType.Linear,
            data: options?.data,
            divMidPoint: options?.divMidPoint,
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
                    colorPalette: this._workbench.getSelectedColorPalette(
                        ColorType.Diverging
                    ) as ContinuousColorPalette,
                });
                setColorScale(newColorScale);
            };

            handleColorPalettesChanged();

            const unsubscribeFunc = this._workbench.subscribe(
                WorkbenchEvents.ColorPalettesChanged,
                handleColorPalettesChanged
            );

            return () => {
                unsubscribeFunc();
            };
        }, [adjustedOptions]);

        return colorScale;
    }

    useContinuousSequentialColorScale(options?: {
        scaleType?: ColorScaleScaleType;
        interpolation?:
            | ColorScaleContinuousInterpolationType.Linear
            | ColorScaleContinuousInterpolationType.Median
            | ColorScaleContinuousInterpolationType.Quartiles
            | ColorScaleContinuousInterpolationType.Quintiles
            | ColorScaleContinuousInterpolationType.Deciles
            | ColorScaleContinuousInterpolationType.NaturalBreaks;
        data?: number[];
    }): ColorScale {
        const optionsWithDefaults: ColorScaleOptions = {
            type: ColorScaleType.Continuous,
            colorPalette: this._workbench.getSelectedColorPalette(ColorType.Sequential) as ContinuousColorPalette,
            gradientType: ColorScaleGradientType.Sequential,
            scaleType: options?.scaleType ?? ColorScaleScaleType.Linear,
            interpolation: options?.interpolation ?? ColorScaleContinuousInterpolationType.Linear,
            data: options?.data,
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
                    colorPalette: this._workbench.getSelectedColorPalette(
                        ColorType.Sequential
                    ) as ContinuousColorPalette,
                });
                setColorScale(newColorScale);
            };

            handleColorPalettesChanged();

            const unsubscribeFunc = this._workbench.subscribe(
                WorkbenchEvents.ColorPalettesChanged,
                handleColorPalettesChanged
            );

            return () => {
                unsubscribeFunc();
            };
        }, [adjustedOptions]);

        return colorScale;
    }

    useContinuousDivergingColorScale(options?: {
        scaleType?: ColorScaleScaleType;
        interpolation?:
            | ColorScaleContinuousInterpolationType.Linear
            | ColorScaleContinuousInterpolationType.Median
            | ColorScaleContinuousInterpolationType.Quartiles
            | ColorScaleContinuousInterpolationType.Quintiles
            | ColorScaleContinuousInterpolationType.Deciles
            | ColorScaleContinuousInterpolationType.NaturalBreaks;
        data?: number[];
        divMidPoint?: number;
    }): ColorScale {
        const optionsWithDefaults: ColorScaleOptions = {
            type: ColorScaleType.Continuous,
            colorPalette: this._workbench.getSelectedColorPalette(ColorType.Diverging) as ContinuousColorPalette,
            gradientType: ColorScaleGradientType.Diverging,
            scaleType: options?.scaleType ?? ColorScaleScaleType.Linear,
            interpolation: options?.interpolation ?? ColorScaleContinuousInterpolationType.Linear,
            data: options?.data,
            divMidPoint: options?.divMidPoint,
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
                    colorPalette: this._workbench.getSelectedColorPalette(
                        ColorType.Diverging
                    ) as ContinuousColorPalette,
                });
                setColorScale(newColorScale);
            };

            handleColorPalettesChanged();

            const unsubscribeFunc = this._workbench.subscribe(
                WorkbenchEvents.ColorPalettesChanged,
                handleColorPalettesChanged
            );

            return () => {
                unsubscribeFunc();
            };
        }, [adjustedOptions]);

        return colorScale;
    }
}
