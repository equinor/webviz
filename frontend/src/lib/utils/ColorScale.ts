import { ContinuousColorPalette } from "@lib/utils/ColorPalette";

export enum ColorScaleType {
    Discrete,
    Continuous,
}

export enum ColorScaleGradientType {
    Sequential,
    Diverging,
}

export type ColorScaleOptions = {
    type: ColorScaleType;
    colorPalette: ContinuousColorPalette;
    gradientType: ColorScaleGradientType;
    steps: number;
};

export class ColorScale {
    private _colorPalette: ContinuousColorPalette;
    private _min: number;
    private _max: number;
    private _type: ColorScaleType;
    private _gradientType: ColorScaleGradientType;
    private _divMidPoint: number;
    private _steps: number;

    constructor(options: ColorScaleOptions) {
        this._colorPalette = options.colorPalette;
        this._min = 0;
        this._max = 1;
        this._type = options.type;
        this._gradientType = options.gradientType;
        this._divMidPoint = 0.5;
        this._steps = options.steps;
    }

    private calcNormalizedValue(value: number, min: number, max: number): number {
        let normalizedValue = 0;
        if (this._gradientType === ColorScaleGradientType.Sequential) {
            normalizedValue = (value - min) / (max - min);
        } else if (this._gradientType === ColorScaleGradientType.Diverging) {
            if (value < this._divMidPoint) {
                normalizedValue = ((value - min) / (this._divMidPoint - min)) * 0.5;
            } else {
                normalizedValue = 0.5 * (1 + (value - this._divMidPoint) / (max - this._divMidPoint));
            }
        }

        return normalizedValue;
    }

    getColorForValue(value: number): string {
        let color = "";

        if (this._type === ColorScaleType.Discrete) {
            const colors = this.sampleColors(this._steps);
            const normalizedValue = this.calcNormalizedValue(value, this._min, this._max);
            const colorIndex = Math.floor(normalizedValue * this._steps);
            color = colors[colorIndex];
        } else {
            const normalizedValue = this.calcNormalizedValue(value, this._min, this._max);
            color = this._colorPalette.getColorAtPosition(normalizedValue);
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

    setRange(min: number, max: number) {
        this._min = min;
        this._max = max;
    }

    setRangeAndMidPoint(min: number, max: number, divMidPoint: number) {
        this._min = min;
        this._max = max;
        this._divMidPoint = divMidPoint;
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
}
