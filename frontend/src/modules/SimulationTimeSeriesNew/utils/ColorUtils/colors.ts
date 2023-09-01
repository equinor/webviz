import { Hsl, formatHex, formatHsl, modeHsl, parseHex, parseHsl, useMode } from "culori";

// **********************************************************************************************
// **********************************************************************************************
//
// THESE FUNCTIONS ARE TAKEN FROM THE webviz-subsurface REPO
//
// **********************************************************************************************
// **********************************************************************************************

export type RGBColor = { r: number; g: number; b: number };
export type RGBAColor = { r: number; g: number; b: number; a: number };

/**
    Converts the given hex color to rgb tuple with floating point byte color values.

    Byte color channels: 0-255

    `Return:`
    RGB color on tuple format Tuple[float, float, float] with r-, g- and b-channel
    on index 0, 1 and 2, respectively. With floating point byte color value 0-255.
 */
export function hexToRgb(hexString: string): RGBColor {
    hexString = hexString.replace("#", "");
    const hlen = hexString.length;
    const rgb: number[] = [];

    for (let i = 0; i < hlen; i += hlen / 3) {
        const channelValue = parseInt(hexString.substring(i, i + hlen / 3), 16);
        rgb.push(channelValue);
    }

    if (rgb.length !== 3) throw new Error(`hexToRgb: Invalid hex color string: ${hexString}`);

    return { r: rgb[0], g: rgb[1], b: rgb[2] };
}

/**
    Converts the given hex color to rgba tuple with floating point byte color values
    and alpha channel as opacity.

    Byte color channels: 0-255
    alpha: 0-1

    `Return:`
    RGBA color on tuple format Tuple[float,float,float,float] with r-, g-, b- and alpha-channel
    on index 0, 1, 2 and 3, respectively. With floating point byte color value 0-255.
 */
export function hexToRgba(hexString: string, opacity = 1.0): RGBAColor {
    const rgb: RGBColor = hexToRgb(hexString);
    const alpha: number = Math.max(0.0, Math.min(1.0, opacity));

    return { r: rgb.r, g: rgb.g, b: rgb.b, a: alpha };
}

/**
    Converts the given hex color to rgb string

    Byte color channels: 0-255

    `Return:`
    RGB color on string format "rgb(r,g,b)" where, channels r, g and b are
    represented with byte color value 0-255.
 */
export function hexToRgbStr(hexString: string): string {
    const rgb: RGBColor = hexToRgb(hexString);
    return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

/**
    Converts the given hex color to rgba string

    Byte color channels: 0-255

    `Return:`
    RGB color on string format "rgba(r,g,b,alpha)" where, channels r, g and b are
    represented with byte color value 0-255.
 */
export function hexToRgbaStr(hexString: string, opacity = 1.0): string {
    const rgba: RGBAColor = hexToRgba(hexString, opacity);
    return `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`;
}

/**
    Converts the given hex color to hsl and adjusts the l-channel with the given scale.

    If conversion to hsl fails, the function returns undefined.
 */
export function scaleHexColorLightness(
    hexColor: string,
    scale: number,
    minScale = 0.1,
    maxScale = 1.5
): string | undefined {
    // Convert min and max to scalar 0-1
    const min = Math.max(0.0, minScale);
    const max = Math.min(2.0, maxScale);

    const hslColor = useMode(modeHsl);
    const result = hslColor(hexColor);
    if (result) {
        const adjustedHslColor = { ...result, l: Math.min(max, Math.max(min, result.l * scale)) };
        return formatHex(formatHsl(adjustedHslColor)) ?? hexColor;
    }

    return undefined;
}
