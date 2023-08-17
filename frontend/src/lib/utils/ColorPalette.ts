import { Oklab, formatHex, interpolate, oklab } from "culori";
import { v4 } from "uuid";

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
}

export type CategoricalColor = {
    id: string;
    hexColor: string;
};

export type CategoricalColorPaletteOptions = {
    name: string;
    hexColors: string[];
    id?: string;
};

export class CategoricalColorPalette extends ColorPalette {
    private _colors: CategoricalColor[];

    constructor(options: CategoricalColorPaletteOptions) {
        super(options.name, options.id);
        this._colors = [];

        for (const color of options.hexColors) {
            this.addColor(color);
        }
    }

    private addColor(hexColor: string): void {
        this.assertHexColor(hexColor);
        this._colors.push({
            id: v4(),
            hexColor,
        });
    }

    getColors(): CategoricalColor[] {
        return this._colors;
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

        this._colorStops = [];

        if (options.colorStops) {
            for (const colorStop of options.colorStops) {
                this.addColorStop(colorStop);
            }
        } else if (options.colors) {
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

    private addColorStop(colorStop: Omit<ColorStop, "id" | "oklabColor">): string {
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
            oklabColor,
        });

        return id;
    }

    private getClosestColorStops(position: number): { smaller?: ColorStop; greater?: ColorStop } {
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

    private interpolateColor(position: number): string {
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

    getGradient(): string {
        const sortedColorStops = this._colorStops.sort((a, b) => a.position - b.position);
        const gradient = `linear-gradient(to right, ${sortedColorStops
            .map((colorStop) => {
                return `${colorStop.hexColor} ${colorStop.position * 100}%`;
            })
            .join(", ")})`;

        return gradient;
    }
}
