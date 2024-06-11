import { ColorPalette } from "@lib/utils/ColorPalette";

export class ColorSet {
    private _colorPalette: ColorPalette;
    private _runningIndex: number;

    constructor(colorPalette: ColorPalette) {
        this._colorPalette = colorPalette;
        this._runningIndex = 0;
    }

    getColorPalette(): ColorPalette {
        return this._colorPalette;
    }

    getColorArray(): string[] {
        return this._colorPalette.getColors();
    }

    getColor(index: number): string {
        if (index < 0 || index >= this._colorPalette.getColors().length) {
            throw new Error(`Color index ${index} is out of bounds`);
        }
        return this._colorPalette.getColors()[index];
    }

    /**
     *
     * @returns The first color in the palette, and resets the running index to 0
     */
    getFirstColor(): string {
        this._runningIndex = Math.min(1, this._colorPalette.getColors().length - 1);
        return this._colorPalette.getColors()[0];
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
        const color = this._colorPalette.getColors()[this._runningIndex];
        this._runningIndex = (this._runningIndex + 1) % this._colorPalette.getColors().length;
        return color;
    }
}
