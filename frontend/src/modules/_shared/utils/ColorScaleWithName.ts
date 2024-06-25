import { ColorScale, ColorScaleGradientType, ColorScaleOptions } from "@lib/utils/ColorScale";

export class ColorScaleWithName extends ColorScale {
    private _name: string;

    constructor(options: ColorScaleOptions & { name: string }) {
        super(options);
        this._name = options.name;
    }

    setName(name: string) {
        this._name = name;
    }

    getName() {
        return this._name;
    }

    static fromColorScale(colorScale: ColorScale, name: string): ColorScaleWithName {
        const newColorScale = new ColorScaleWithName({
            type: colorScale.getType(),
            colorPalette: colorScale.getColorPalette(),
            gradientType: colorScale.getGradientType(),
            steps: colorScale.getNumSteps(),
            name,
        });

        if (colorScale.getGradientType() === ColorScaleGradientType.Diverging) {
            newColorScale.setRangeAndMidPoint(colorScale.getMin(), colorScale.getMax(), colorScale.getDivMidPoint());
        } else {
            newColorScale.setRange(colorScale.getMin(), colorScale.getMax());
        }

        return newColorScale;
    }

    override clone(): ColorScaleWithName {
        const newColorScale = new ColorScaleWithName({
            type: this.getType(),
            colorPalette: this.getColorPalette(),
            gradientType: this.getGradientType(),
            steps: this.getNumSteps(),
            name: this._name,
        });

        if (this.getGradientType() === ColorScaleGradientType.Diverging) {
            newColorScale.setRangeAndMidPoint(this.getMin(), this.getMax(), this.getDivMidPoint());
        } else {
            newColorScale.setRange(this.getMin(), this.getMax());
        }

        return newColorScale;
    }
}
