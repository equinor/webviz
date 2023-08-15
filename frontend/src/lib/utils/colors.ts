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
