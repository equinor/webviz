import { ColorPalette } from "@lib/utils/ColorPalette";
import { ColorScale, ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";
import { makeColorMapFunctionFromColorScale } from "@modules/_shared/LayerFramework/visualization/utils/colors";

import type { Rgb} from "culori";
import { parse } from "culori";
import { describe, expect, test } from "vitest";

const COLOR_SCALE = new ColorScale({
    colorPalette: new ColorPalette({
        id: "test",
        name: "test",
        colors: ["#000000", "#111111", "#222222", "#333333", "#444444"],
    }),
    gradientType: ColorScaleGradientType.Sequential,
    type: ColorScaleType.Continuous,
    steps: 5,
    min: 0,
    max: 100,
});

describe("makeColorMapFunctionFromColorScale", () => {
    test("Maps to expected colors when values are normalized", () => {
        const colorMapFunc = makeColorMapFunctionFromColorScale(COLOR_SCALE, 0, 100, true);

        expect(colorMapFunc).toBeInstanceOf(Function);
        if (!colorMapFunc) {
            throw new Error("Color map function not created");
        }

        for (let i = 0; i < 5; i++) {
            const normalizedValue = i / 4;
            const expectedColorHex = `#${i}${i}${i}${i}${i}${i}`;
            const expectedColorRgb = parse(expectedColorHex) as Rgb;
            expect(colorMapFunc(normalizedValue)).toStrictEqual([
                (expectedColorRgb?.r ?? 0) * 255,
                (expectedColorRgb?.g ?? 0) * 255,
                (expectedColorRgb?.b ?? 0) * 255,
            ]);
        }
    });

    test("Maps to the expected colors when values are not normalized", () => {
        const colorMapFunc = makeColorMapFunctionFromColorScale(COLOR_SCALE, 0, 100, false);

        expect(colorMapFunc).toBeInstanceOf(Function);
        if (!colorMapFunc) {
            throw new Error("Color map function not created");
        }

        for (let i = 0; i < 5; i++) {
            const nonNormalizedValue = (i / 4) * 100;
            const expectedColorHex = `#${i}${i}${i}${i}${i}${i}`;
            const expectedColorRgb = parse(expectedColorHex) as Rgb;
            expect(colorMapFunc(nonNormalizedValue)).toStrictEqual([
                (expectedColorRgb?.r ?? 0) * 255,
                (expectedColorRgb?.g ?? 0) * 255,
                (expectedColorRgb?.b ?? 0) * 255,
            ]);
        }
    });
});
