import { Oklab, formatHex, interpolate, oklab } from "culori";

type ColorStop = {
    hexColor: string;
    oklabColor: Oklab;
    position: number;
};

export type ColorPaletteOptions = {
    name: string;
    colors: string[];
    id: string;
};

export class ColorPalette {
    private _id: string;
    private _name: string;
    private _colorStops: ColorStop[];

    constructor(options: ColorPaletteOptions) {
        this._id = options.id;
        this._name = options.name;
        this._colorStops = [];

        let position = 0;
        let index = 0;

        for (const hexColor of options.colors) {
            this.addColorStop({ hexColor, position: index < options.colors.length - 1 ? position : 1 });
            position += 1 / (options.colors.length - 1);
            index++;
        }
    }

    private assertHexColor(hexColor: string): void {
        const hexColorRegExp = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (!hexColorRegExp.test(hexColor)) {
            throw new Error("Invalid hex color");
        }
    }

    private assertValidPositions(positions: { position?: number }): void {
        if (positions.position && (positions.position < 0 || positions.position > 1)) {
            throw new Error("Invalid position");
        }
    }

    private addColorStop(colorStop: Omit<ColorStop, "oklabColor">) {
        this.assertHexColor(colorStop.hexColor);
        this.assertValidPositions({ position: colorStop.position });

        const oklabColor = oklab(colorStop.hexColor);

        if (!oklabColor) {
            throw new Error("Invalid hex color");
        }

        this._colorStops.push({
            ...colorStop,
            oklabColor,
        });
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

    getId(): string {
        return this._id;
    }

    getName(): string {
        return this._name;
    }

    getColors(): string[] {
        return this._colorStops.map((colorStop) => colorStop.hexColor);
    }

    getInterpolatedColor(position: number): string {
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
