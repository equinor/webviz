import { ColorPalette } from "@lib/utils/ColorPalette";

export enum ColorScaleType {
    Discrete = "discrete",
    Continuous = "continuous",
}

export enum ColorScaleGradientType {
    Sequential = "sequential",
    Diverging = "diverging",
}

export enum ColorScalePlotlyType {
    Marker = "marker",
    Map = "map",
}

export type ColorStop = {
    offset: number;
    color: string;
    value: number;
};

export type PlotlyMarkerColorScaleObject = {
    colorscale: Array<[number, string]>;
    cmin: number;
    cmax: number;
    cmid?: number;
};

export type PlotlyMapColorScaleObject = {
    colorscale: Array<[number, string]>;
    zmin: number;
    zmax: number;
    zmid?: number;
    colorbar?: {
        tickmode: "array";
        tickvals: number[];
    };
};

export type ColorScaleOptions = {
    type: ColorScaleType;
    colorPalette: ColorPalette;
    gradientType: ColorScaleGradientType;
    steps: number;
    min?: number;
    max?: number;
    divMidPoint?: number;
};

export class ColorScale {
    private _colorPalette: ColorPalette;
    private _min: number;
    private _max: number;
    private _type: ColorScaleType;
    private _gradientType: ColorScaleGradientType;
    private _divMidPoint: number;
    private _steps: number;

    constructor(options: ColorScaleOptions) {
        this._colorPalette = options.colorPalette;
        this._min = options.min ?? 0;
        this._max = options.max ?? 1;
        this._type = options.type;
        this._gradientType = options.gradientType;
        this._divMidPoint = options.divMidPoint ?? 0.5;
        this._steps = options.steps;
    }

    private calcNormalizedValue(value: number, min: number, max: number): number {
        if (this._gradientType === ColorScaleGradientType.Sequential) {
            if (max === min) {
                return 1;
            }
            return (value - min) / (max - min);
        }
        if (this._gradientType === ColorScaleGradientType.Diverging) {
            if (max === min) {
                return 0.5;
            }
            if (value < this._divMidPoint) {
                if (this._divMidPoint === min) {
                    return 0.5;
                }
                return ((value - min) / (this._divMidPoint - min)) * 0.5;
            }
            if (this._divMidPoint === max) {
                return 0.5;
            }
            return 0.5 * (1 + (value - this._divMidPoint) / (max - this._divMidPoint));
        }
        return 0;
    }

    getColorPalette(): ColorPalette {
        return this._colorPalette;
    }

    getColorForValue(value: number): string {
        let color = "";

        if (this._type === ColorScaleType.Discrete) {
            const colors = this.sampleColors(this._steps);
            const normalizedValue = this.calcNormalizedValue(value, this._min, this._max);
            const colorIndex = Math.min(Math.floor(normalizedValue * this._steps), colors.length - 1);
            color = colors[colorIndex];
        } else {
            const normalizedValue = this.calcNormalizedValue(value, this._min, this._max);
            // Clamp normalized value to [0,1] to avoid out of bounds errors
            const clampedNormalizedValue = Math.min(Math.max(normalizedValue, 0), 1);
            color = this._colorPalette.getInterpolatedColor(clampedNormalizedValue);
        }

        return color;
    }

    getMin(): number {
        return this._min;
    }

    getMax(): number {
        return this._max;
    }

    getType(): ColorScaleType {
        return this._type;
    }

    getGradientType(): ColorScaleGradientType {
        return this._gradientType;
    }

    getDivMidPoint(): number {
        return this._divMidPoint;
    }

    getNumSteps(): number {
        return this._steps;
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

    sampleColors(numSamples: number): string[] {
        const colors: string[] = [];
        for (let i = 0; i < numSamples; i++) {
            const startPos = i / numSamples;
            const endPos = (i + 1) / numSamples;
            colors.push(this._colorPalette.getInterpolatedColor(startPos + (endPos - startPos) / 2));
        }
        return colors;
    }

    getColorStops(): ColorStop[] {
        const colorStops: ColorStop[] = [];
        if (this._gradientType === ColorScaleGradientType.Diverging) {
            for (let i = 0; i < 50; i++) {
                const value = this._min + (this._divMidPoint - this._min) * (i / 50);
                colorStops.push({
                    offset: (value - this._min) / (this._max - this._min),
                    color: this.getColorForValue(value),
                    value,
                });
            }
            for (let i = 50; i <= 100; i++) {
                const value = this._divMidPoint + (this._max - this._divMidPoint) * ((i - 50) / 50);
                colorStops.push({
                    offset: (value - this._min) / (this._max - this._min),
                    color: this.getColorForValue(value),
                    value,
                });
            }
        } else {
            for (let i = 0; i <= 100; i++) {
                const value = this._min + (this._max - this._min) * (i / 100);
                colorStops.push({
                    offset: (value - this._min) / (this._max - this._min),
                    color: this.getColorForValue(value),
                    value,
                });
            }
        }

        return colorStops;
    }

    getPlotlyColorScale(): [number, string][] {
        if (this._min === this._max) {
            return [
                [0, this.getColorForValue(this._min)],
                [1, this.getColorForValue(this._max)],
            ];
        }
        const plotlyColorScale: [number, string][] = [];
        for (let i = 0; i <= 100; i++) {
            if (i > 0) {
                plotlyColorScale.push([
                    i / 100 - 0.000001,
                    this.getColorForValue(this._min + (this._max - this._min) * ((i - 1) / 100)),
                ]);
            }
            plotlyColorScale.push([i / 100, this.getColorForValue(this._min + (this._max - this._min) * (i / 100))]);
        }
        return plotlyColorScale;
    }

    getColorMap(): string[] {
        return this.getPlotlyColorScale().map((color) => color[1]);
    }

    getAsPlotlyColorScaleMarkerObject(): PlotlyMarkerColorScaleObject {
        return {
            colorscale: this.getPlotlyColorScale(),
            cmin: this._min,
            cmax: this._max,
            cmid: this._gradientType === ColorScaleGradientType.Diverging ? this._divMidPoint : undefined,
        };
    }

    getAsPlotlyColorScaleMapObject(): PlotlyMapColorScaleObject {
        const tickValsArray: number[] = [];
        if (this._type === ColorScaleType.Discrete) {
            for (let i = 0; i <= this._steps; i++) {
                let value = this._min + (this._max - this._min) * (i / this._steps);
                if (this._gradientType === ColorScaleGradientType.Diverging) {
                    if (i <= this._steps / 2) {
                        value = this._min + (this._divMidPoint - this._min) * (i / (this._steps / 2));
                    } else {
                        value =
                            this._divMidPoint +
                            (this._max - this._divMidPoint) * ((i - this._steps / 2) / (this._steps / 2));
                    }
                }
                tickValsArray.push(value);
            }
        }

        return {
            colorscale: this.getPlotlyColorScale(),
            zmin: this._min,
            zmax: this._max,
            zmid: this._gradientType === ColorScaleGradientType.Diverging ? this._divMidPoint : undefined,
            colorbar:
                this._type === ColorScaleType.Discrete
                    ? {
                          tickmode: "array",
                          tickvals: tickValsArray,
                      }
                    : undefined,
        };
    }

    clone(): ColorScale {
        return new ColorScale({
            type: this._type,
            colorPalette: this._colorPalette,
            gradientType: this._gradientType,
            steps: this._steps,
            min: this._min,
            max: this._max,
            divMidPoint: this._divMidPoint,
        });
    }
}
