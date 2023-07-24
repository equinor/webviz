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

    getUuid(): string {
        return this._uuid;
    }

    addColor(hexColor: string): void {
        const hexColorRegExp = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (hexColorRegExp.test(hexColor)) {
            this._colors.push(hexColor);
        } else {
            throw new Error("Invalid hex color");
        }
    }

    getColors(): string[] {
        return this._colors;
    }

    removeColor(hexColor: string): void {
        this._colors = this._colors.filter((color) => color !== hexColor);
    }
}
