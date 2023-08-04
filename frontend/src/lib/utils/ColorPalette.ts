import { v4 } from "uuid";

export type HsvColor = {
    h: number;
    s: number;
    v: number;
};

export function convertHexToHsv(hexColor: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor);

    if (!result) {
        throw new Error("Invalid hex color");
    }

    const r = parseInt(result[1], 16) / 255;
    const g = parseInt(result[2], 16) / 255;
    const b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);

    const delta = max - min;

    let h = max;
    const s = max === 0 ? 0 : delta / max;
    const v = max;

    if (max === min) {
        h = 0;
    } else {
        switch (max) {
            case r:
                h = (g - b) / delta + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / delta + 2;
                break;
            case b:
                h = (r - g) / delta + 4;
                break;
        }
        h /= 6;
    }

    return { h, s, v };
}

export function convertDecimalToHex(decimal: number) {
    const hex = [0, 0];

    let i = 0;
    while (decimal > 0) {
        const temp = decimal % 16;

        if (temp < 10) {
            hex[i] = temp + 48;
            i++;
        } else {
            hex[i] = temp + 55;
            i++;
        }

        decimal = Math.floor(decimal / 16);
    }

    let hexCode = "";
    if (i === 2) {
        hexCode = `${String.fromCharCode(hex[1])}${String.fromCharCode(hex[0])}`;
    } else if (i === 1) {
        hexCode = `0${String.fromCharCode(hex[0])}`;
    } else {
        hexCode = "00";
    }

    return hexCode;
}

export function convertRgbToHex(rgbColor: { r: number; g: number; b: number }) {
    const { r, g, b } = rgbColor;

    const hexCode = `#${convertDecimalToHex(r)}${convertDecimalToHex(g)}${convertDecimalToHex(b)}`;

    return hexCode;
}

export function convertHsvToHex(hsvColor: HsvColor) {
    const { h, s, v } = hsvColor;

    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    let r = 0;
    let g = 0;
    let b = 0;

    switch (i % 6) {
        case 0:
            r = v;
            g = t;
            b = p;
            break;
        case 1:
            r = q;
            g = v;
            b = p;
            break;
        case 2:
            r = p;
            g = v;
            b = t;
            break;
        case 3:
            r = p;
            g = q;
            b = v;
            break;
        case 4:
            r = t;
            g = p;
            b = v;
            break;
        case 5:
            r = v;
            g = p;
            b = q;
            break;
    }

    const hexColor = convertRgbToHex({ r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) });

    return hexColor;
}

export function interpolateHsv(hsvColor1: HsvColor, hsvColor2: HsvColor, positionQuotient: number) {
    const { h: h1, s: s1, v: v1 } = hsvColor1;
    const { h: h2, s: s2, v: v2 } = hsvColor2;

    const h = h1 + (h2 - h1) * positionQuotient;
    const s = s1 + (s2 - s1) * positionQuotient;
    const v = v1 + (v2 - v1) * positionQuotient;

    return { h, s, v };
}

export function interpolateHex(hexColor1: string, hexColor2: string, positionQuotient: number) {
    const hsvColor1 = convertHexToHsv(hexColor1);
    const hsvColor2 = convertHexToHsv(hexColor2);

    const interpolatedHsvColor = interpolateHsv(hsvColor1, hsvColor2, positionQuotient);

    const interpolatedHexColor = convertHsvToHex(interpolatedHsvColor);

    return interpolatedHexColor;
}

export function extrapolateHsv(hsvColor1: HsvColor, hsvColor2: HsvColor, positionQuotient: number) {
    const { h: h1, s: s1, v: v1 } = hsvColor1;
    const { h: h2, s: s2, v: v2 } = hsvColor2;

    const h = h2 + (h2 - h1) * positionQuotient;
    const s = s2 + (s2 - s1) * positionQuotient;
    const v = v2 + (v2 - v1) * positionQuotient;

    return { h, s, v };
}

export function extrapolateHex(hexColor1: string, hexColor2: string, positionQuotient: number) {
    const hsvColor1 = convertHexToHsv(hexColor1);
    const hsvColor2 = convertHexToHsv(hexColor2);

    const extrapolatedHsvColor = extrapolateHsv(hsvColor1, hsvColor2, positionQuotient);

    const extrapolatedHexColor = convertHsvToHex(extrapolatedHsvColor);

    return extrapolatedHexColor;
}

export enum ColorPaletteType {
    Categorical = "Categorical",
    Continuous = "Continuous",
}

export class ColorPalette {
    protected _uuid: string;
    protected _name: string;

    constructor(name: string) {
        this._uuid = v4();
        this._name = name;
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
        copy._uuid = v4();
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

    constructor(name: string, hexColors: string[]) {
        super(name);
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
        clone._uuid = this._uuid;
        return clone;
    }

    toJson(): string {
        return JSON.stringify({
            uuid: this._uuid,
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
        colorPalette._uuid = uuid;
        return colorPalette;
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

    constructor(name: string, colorStops: Omit<ColorStop, "id">[]) {
        super(name);
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

    addColorStop(colorStop: Omit<ColorStop, "id">): string {
        this.assertHexColor(colorStop.hexColor);
        this.assertValidPositions({ position: colorStop.position, midPointPosition: colorStop.midPointPosition });

        const id = v4();

        this._colorStops.push({
            ...colorStop,
            id,
        });

        return id;
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

    getClosestColorStops(position: number): { smaller?: ColorStop; greater?: ColorStop } {
        const sortedColorStops = this._colorStops.sort((a, b) => a.position - b.position);
        const closestColorStops: { smaller?: ColorStop; greater?: ColorStop } = {};

        for (const colorStop of sortedColorStops) {
            if (colorStop.position <= position) {
                closestColorStops.smaller = colorStop;
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

        const interpolatedHexColor = interpolateHex(smaller.hexColor, greater.hexColor, relativePosition);

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
            const interpolatedHexColor = interpolateHex(smaller.hexColor, greater.hexColor, positionQuotient);

            return interpolatedHexColor;
        } else if (!smaller && greater) {
            if (greater.position === position) {
                return greater.hexColor;
            }
            const nextColorStop = this.getNextColorStop(greater.id);
            if (nextColorStop) {
                const positionQuotient = (position - greater.position) / (nextColorStop.position - greater.position);
                const extrapolatedHexColor = extrapolateHex(greater.hexColor, nextColorStop.hexColor, positionQuotient);

                return extrapolatedHexColor;
            }
        } else if (smaller && !greater) {
            if (smaller.position === position) {
                return smaller.hexColor;
            }
            const previousColorStop = this.getPreviousColorStop(smaller.id);
            if (previousColorStop) {
                const positionQuotient =
                    (position - previousColorStop.position) / (smaller.position - previousColorStop.position);
                const extrapolatedHexColor = extrapolateHex(
                    previousColorStop.hexColor,
                    smaller.hexColor,
                    positionQuotient
                );

                return extrapolatedHexColor;
            }
        }

        throw new Error("Invalid position");
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
                if (prev) {
                    const midPoint = prev.position + prev.midPointPosition * (colorStop.position - prev.position);
                    return `${midPoint * 100}%, ${colorStop.hexColor} ${colorStop.position * 100}%`;
                }
                return `${colorStop.hexColor} ${colorStop.position * 100}%`;
            })
            .join(", ")})`;

        return gradient;
    }

    clone(): ContinuousColorPalette {
        const clone = new ContinuousColorPalette(this._name, this._colorStops);
        clone._uuid = this._uuid;
        return clone;
    }

    toJson(): string {
        return JSON.stringify({
            uuid: this._uuid,
            name: this._name,
            colorStops: this._colorStops,
        });
    }

    static fromJson(json: string): ContinuousColorPalette {
        const { uuid, name, colorStops } = JSON.parse(json);
        const colorPalette = new ContinuousColorPalette(name, colorStops);
        colorPalette._uuid = uuid;
        return colorPalette;
    }
}
