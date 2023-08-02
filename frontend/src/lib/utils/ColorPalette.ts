import { v4 } from "uuid";

export enum ColorPaletteType {
    Categorical = "Categorical",
    Continuous = "Continuous",
}

export class ColorPalette {
    protected _uuid: string;

    constructor() {
        this._uuid = v4();
    }

    protected assertHexColor(hexColor: string): void {
        const hexColorRegExp = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (!hexColorRegExp.test(hexColor)) {
            throw new Error("Invalid hex color");
        }
    }

    getUuid(): string {
        return this._uuid;
    }

    clone(): ColorPalette {
        throw new Error("Not implemented");
    }

    makeCopy(): ColorPalette {
        const copy = this.clone();
        copy._uuid = v4();
        return copy;
    }
}

export type CategoricalColor = {
    id: string;
    hexColor: string;
};

export class CategoricalColorPalette extends ColorPalette {
    private _colors: CategoricalColor[];

    constructor(hexColors: string[]) {
        super();
        this._colors = [];

        for (const color of hexColors) {
            this.addColor(color);
        }
    }

    addColor(hexColor: string): void {
        this.assertHexColor(hexColor);
        this._colors.push({
            id: v4(),
            hexColor,
        });
    }

    changeColor(id: string, hexColor: string): void {
        this.assertHexColor(hexColor);
        const color = this._colors.find((color) => color.id === id);
        if (color) {
            color.hexColor = hexColor;
        }
    }

    getColors(): CategoricalColor[] {
        return this._colors;
    }

    removeColor(id: string): void {
        const index = this._colors.findIndex((color) => color.id === id);
        if (index !== -1) {
            this._colors.splice(index, 1);
        }
    }

    moveColor(id: string, newIndex: number) {
        const oldIndex = this._colors.findIndex((color) => color.id === id);
        this._colors.splice(Math.max(newIndex - 1, 0), 0, this._colors.splice(oldIndex, 1)[0]);
    }

    clone(): CategoricalColorPalette {
        const clone = new CategoricalColorPalette(this._colors.map((color) => color.hexColor));
        clone._uuid = this._uuid;
        return clone;
    }
}

export type ColorStop = {
    id: string;
    hexColor: string;
    position: number;
    midPointPosition: number;
};

export class ContinuousColorPalette extends ColorPalette {
    private _colorStops: ColorStop[];

    constructor(colorStops: Omit<ColorStop, "id">[]) {
        super();
        this._colorStops = [];

        for (const colorStop of colorStops) {
            this.addColorStop(colorStop);
        }
    }

    private assertValidPositions(positions: { position?: number; midPointPosition?: number }): void {
        if (positions.position && (positions.position < 0 || positions.position > 1)) {
            throw new Error("Invalid position");
        }

        if (positions.midPointPosition && (positions.midPointPosition < 0 || positions.midPointPosition > 1)) {
            throw new Error("Invalid mid point position");
        }
    }

    addColorStop(colorStop: Omit<ColorStop, "id">): void {
        this.assertHexColor(colorStop.hexColor);
        this.assertValidPositions({ position: colorStop.position, midPointPosition: colorStop.midPointPosition });

        this._colorStops.push({
            ...colorStop,
            id: v4(),
        });
    }

    changeColorStopColor(id: string, hexColor: string): void {
        this.assertHexColor(hexColor);
        const colorStop = this._colorStops.find((colorStop) => colorStop.id === id);
        if (colorStop) {
            colorStop.hexColor = hexColor;
        }
    }

    changeColorStopPosition(id: string, position: number): void {
        this.assertValidPositions({ position });

        this._colorStops = this._colorStops.map((colorStop) => {
            if (colorStop.id === id) {
                return {
                    ...colorStop,
                    position,
                };
            } else {
                return colorStop;
            }
        });
    }

    changeColorStopMidPointPosition(id: string, midPointPosition: number): void {
        this.assertValidPositions({ midPointPosition });

        this._colorStops = this._colorStops.map((colorStop) => {
            if (colorStop.id === id) {
                return {
                    ...colorStop,
                    midPointPosition,
                };
            } else {
                return colorStop;
            }
        });
    }

    getNextColorStop(id: string): ColorStop | undefined {
        const index = this._colorStops.findIndex((colorStop) => colorStop.id === id);
        if (index !== -1 && index < this._colorStops.length - 1) {
            return this._colorStops[index + 1];
        }
        return undefined;
    }

    getPreviousColorStop(id: string): ColorStop | undefined {
        const index = this._colorStops.findIndex((colorStop) => colorStop.id === id);
        if (index !== -1 && index > 0) {
            return this._colorStops[index - 1];
        }
        return undefined;
    }

    getColorStops(): ColorStop[] {
        return this._colorStops;
    }

    getColorStop(id: string): ColorStop | undefined {
        return this._colorStops.find((colorStop) => colorStop.id === id);
    }

    removeColorStop(id: string): void {
        const index = this._colorStops.findIndex((colorStop) => colorStop.id === id);
        if (index !== -1) {
            this._colorStops.splice(index, 1);
        }
    }

    getGradient(): string {
        const sortedColorStops = this._colorStops.sort((a, b) => a.position - b.position);
        const gradient = `linear-gradient(to right, ${sortedColorStops
            .map((colorStop) => {
                const prev = this.getPreviousColorStop(colorStop.id);
                const next = this.getNextColorStop(colorStop.id);
                if (next) {
                    const midPointPosition =
                        colorStop.position + colorStop.midPointPosition * (next.position - colorStop.position);
                    if (prev) {
                        const prevMidPointPosition =
                            2 * (prev.position + prev.midPointPosition * (colorStop.position - prev.position) - 0.5);

                        if (prev.midPointPosition < 0.5) {
                            return `${colorStop.hexColor} ${prevMidPointPosition * 100}% ${midPointPosition * 100}%`;
                        }
                        return `${colorStop.hexColor} ${colorStop.position * 100}% ${midPointPosition * 100}%`;
                    }
                }
                if (prev) {
                    const prevMidPointPosition =
                        prev.position + prev.midPointPosition * (colorStop.position - prev.position);

                    if (prev.midPointPosition < 0.5) {
                        return `${colorStop.hexColor} ${prevMidPointPosition * 100}%`;
                    }
                }
                return `${colorStop.hexColor} ${colorStop.position * 100}%`;
            })
            .join(", ")})`;

        return gradient;
    }

    clone(): ContinuousColorPalette {
        const clone = new ContinuousColorPalette(this._colorStops);
        clone._uuid = this._uuid;
        return clone;
    }
}
