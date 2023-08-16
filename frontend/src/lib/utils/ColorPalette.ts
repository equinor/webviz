import { Oklab, formatHex, interpolate, oklab } from "culori";
import { v4 } from "uuid";

export enum ColorPaletteType {
    Categorical = "Categorical",
    Continuous = "Continuous",
}

export class ColorPalette {
    protected _id: string;
    protected _name: string;

    constructor(name: string, id?: string) {
        this._id = id ?? v4();
        this._name = name;
    }

    protected assertHexColor(hexColor: string): void {
        const hexColorRegExp = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (!hexColorRegExp.test(hexColor)) {
            throw new Error("Invalid hex color");
        }
    }

    getId(): string {
        return this._id;
    }

    getName(): string {
        return this._name;
    }

    setName(name: string): void {
        this._name = name;
    }

    clone(): ColorPalette {
        throw new Error("Not implemented");
    }

    makeCopy(): ColorPalette {
        const copy = this.clone();
        copy._id = v4();
        copy._name = `${this._name} (copy)`;
        return copy;
    }

    toJson(): string {
        throw new Error("Not implemented");
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static fromJson(json: string): ColorPalette {
        throw new Error("Not implemented");
    }
}

export type CategoricalColor = {
    id: string;
    hexColor: string;
};

export class CategoricalColorPalette extends ColorPalette {
    private _colors: CategoricalColor[];

    constructor(name: string, hexColors: string[], id?: string) {
        super(name, id);
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

    getIndex(id: string): number {
        return this._colors.findIndex((color) => color.id === id);
    }

    moveColor(id: string, newIndex: number) {
        const oldIndex = this.getIndex(id);
        const oldColor = this._colors[oldIndex];
        this._colors.splice(Math.max(0, newIndex), 0, oldColor);

        if (oldIndex > newIndex) {
            this._colors.splice(oldIndex + 1, 1);
            return;
        }

        this._colors.splice(oldIndex, 1);
    }

    clone(): CategoricalColorPalette {
        const clone = new CategoricalColorPalette(
            this._name,
            this._colors.map((color) => color.hexColor)
        );
        clone._id = this._id;
        return clone;
    }

    toJson(): string {
        return JSON.stringify({
            uuid: this._id,
            name: this._name,
            colors: this._colors,
        });
    }

    static fromJson(json: string): CategoricalColorPalette {
        const { uuid, name, colors } = JSON.parse(json);
        const colorPalette = new CategoricalColorPalette(
            name,
            colors.map((color: CategoricalColor) => color.hexColor)
        );
        colorPalette._id = uuid;
        return colorPalette;
    }
}

export type ColorStop = {
    id: string;
    hexColor: string;
    oklabColor: Oklab;
    position: number;
};

export type ContinuousColorPaletteOptions = {
    name: string;
    colorStops?: Omit<ColorStop, "id" | "oklabColor">[];
    colors?: string[];
    id?: string;
};

export class ContinuousColorPalette extends ColorPalette {
    private _colorStops: ColorStop[];

    constructor(options: ContinuousColorPaletteOptions) {
        super(options.name, options.id);

        if (options.colorStops) {
            this._colorStops = [];

            for (const colorStop of options.colorStops) {
                this.addColorStop(colorStop);
            }
        } else if (options.colors) {
            this._colorStops = [];

            let position = 0;
            let index = 0;

            for (const hexColor of options.colors) {
                this.addColorStop({ hexColor, position: index < options.colors.length - 1 ? position : 1 });
                position += 1 / (options.colors.length - 1);
                index++;
            }
        } else {
            throw new Error("Invalid options. You must either definer colorStops or colorsList");
        }
    }

    private assertValidPositions(positions: { position?: number }): void {
        if (positions.position && (positions.position < 0 || positions.position > 1)) {
            throw new Error("Invalid position");
        }
    }

    addColorStop(colorStop: Omit<ColorStop, "id" | "oklabColor">): string {
        this.assertHexColor(colorStop.hexColor);
        this.assertValidPositions({ position: colorStop.position });

        const id = v4();

        const oklabColor = oklab(colorStop.hexColor);

        if (!oklabColor) {
            throw new Error("Invalid hex color");
        }

        this._colorStops.push({
            ...colorStop,
            id,
            oklabColor: oklabColor,
        });

        return id;
    }

    changeColorStopColor(id: string, hexColor: string): void {
        this.assertHexColor(hexColor);
        const colorStop = this._colorStops.find((colorStop) => colorStop.id === id);
        const oklabColor = oklab(hexColor);
        if (colorStop && oklabColor) {
            colorStop.hexColor = hexColor;
            colorStop.oklabColor = oklabColor;
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

    getClosestColorStops(position: number): { smaller?: ColorStop; greater?: ColorStop } {
        const sortedColorStops = this._colorStops.sort((a, b) => a.position - b.position);
        const closestColorStops: { smaller?: ColorStop; greater?: ColorStop } = {};

        for (const colorStop of sortedColorStops) {
            if (colorStop.position < position) {
                closestColorStops.smaller = colorStop;
            } else if (colorStop.position === position) {
                closestColorStops.smaller = colorStop;
                closestColorStops.greater = colorStop;
                break;
            } else {
                closestColorStops.greater = colorStop;
                break;
            }
        }

        return closestColorStops;
    }

    interpolateColor(position: number): string {
        const { smaller, greater } = this.getClosestColorStops(position);

        if (!smaller || !greater) {
            throw new Error("Invalid position");
        }

        const relativePosition = (position - smaller.position) / (greater.position - smaller.position);

        const interpolator = interpolate([smaller.oklabColor, greater.oklabColor], "oklab");

        const interpolatedHexColor = formatHex(interpolator(relativePosition));
        return interpolatedHexColor;
    }

    getColorAtPosition(position: number): string {
        const { smaller, greater } = this.getClosestColorStops(position);

        if (smaller && greater) {
            if (smaller.position === position) {
                return smaller.hexColor;
            } else if (greater.position === position) {
                return greater.hexColor;
            }
            const positionQuotient = (position - smaller.position) / (greater.position - smaller.position);
            const interpolator = interpolate([smaller.oklabColor, greater.oklabColor], "oklab");

            const interpolatedHexColor = formatHex(interpolator(positionQuotient));

            return interpolatedHexColor;
        }

        throw new Error(`Invalid position: ${position}`);
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
                return `${colorStop.hexColor} ${colorStop.position * 100}%`;
            })
            .join(", ")})`;

        return gradient;
    }

    clone(): ContinuousColorPalette {
        const clone = new ContinuousColorPalette({ name: this._name, colorStops: this._colorStops });
        clone._id = this._id;
        return clone;
    }

    toJson(): string {
        return JSON.stringify({
            uuid: this._id,
            name: this._name,
            colorStops: this._colorStops,
        });
    }

    static fromJson(json: string): ContinuousColorPalette {
        const { uuid, name, colorStops } = JSON.parse(json);
        const colorPalette = new ContinuousColorPalette({ name, colorStops });
        colorPalette._id = uuid;
        return colorPalette;
    }
}
