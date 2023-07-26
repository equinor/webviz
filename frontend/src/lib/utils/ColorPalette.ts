import { v4 } from "uuid";

export class ColorPalette {
    private _uuid: string;
    private _colors: string[];

    constructor(hexColors: string[]) {
        this._uuid = v4();
        this._colors = [];

        for (const color of hexColors) {
            this.addColor(color);
        }
    }

    private assertHexColor(hexColor: string): void {
        const hexColorRegExp = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (!hexColorRegExp.test(hexColor)) {
            throw new Error("Invalid hex color");
        }
    }

    getUuid(): string {
        return this._uuid;
    }

    addColor(hexColor: string): void {
        this.assertHexColor(hexColor);
        this._colors.push(hexColor);
    }

    changeColor(index: number, hexColor: string): void {
        this.assertHexColor(hexColor);
        this._colors[index] = hexColor;
    }

    getColors(): string[] {
        return this._colors;
    }

    removeColor(index: number): void {
        this._colors.splice(index, 1);
    }

    moveColor(oldIndex: number, newIndex: number) {
        this._colors.splice(Math.max(newIndex - 1, 0), 0, this._colors.splice(oldIndex, 1)[0]);
    }

    clone(): ColorPalette {
        const clone = new ColorPalette(this._colors);
        clone._uuid = this._uuid;
        return clone;
    }
}
