import type { Rgb } from "culori";
import { parse } from "culori";
import { describe, expect, test } from "vitest";

import type { ColorScaleSpecification } from "@framework/components/ColorScaleSelector/colorScaleSelector";
import { ColorPalette } from "@lib/utils/ColorPalette";
import { ColorScale, ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";
import { makeColorMapFunctionFromColorScale } from "@modules/_shared/DataProviderFramework/visualization/utils/colors";

const COLOR_SCALE_SPEC: ColorScaleSpecification = {
    colorScale: new ColorScale({
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
    }),
    areBoundariesUserDefined: false,
};

describe("makeColorMapFunctionFromColorScale", () => {
    test("Maps to expected colors when values are unnormalized (raw values)", () => {
        const colorMapFunc = makeColorMapFunctionFromColorScale(COLOR_SCALE_SPEC, {
            valueMin: 0,
            valueMax: 100,
            unnormalize: false, // use raw values as-is
        });

        expect(colorMapFunc).toBeInstanceOf(Function);
        if (!colorMapFunc) throw new Error("Color map function not created");

        const expectedHexes = ["#000000", "#111111", "#222222", "#333333", "#444444"];

        for (let i = 0; i < 5; i++) {
            const value = i * 25; // 0, 25, 50, 75, 100
            const expectedColorRgb = parse(expectedHexes[i]) as Rgb;

            expect(colorMapFunc(value)).toStrictEqual([
                (expectedColorRgb.r ?? 0) * 255,
                (expectedColorRgb.g ?? 0) * 255,
                (expectedColorRgb.b ?? 0) * 255,
                (expectedColorRgb.alpha ?? 1) * 255,
            ]);
        }
    });

    test("Maps to expected colors when values are normalized", () => {
        const colorMapFunc = makeColorMapFunctionFromColorScale(COLOR_SCALE_SPEC, {
            valueMin: 0,
            valueMax: 100,
            unnormalize: true, // normalized inputs
        });

        expect(colorMapFunc).toBeInstanceOf(Function);
        if (!colorMapFunc) throw new Error("Color map function not created");

        const expectedHexes = ["#000000", "#111111", "#222222", "#333333", "#444444"];

        for (let i = 0; i < 5; i++) {
            const normalizedValue = i / 4; // 0, 0.25, ..., 1
            const expectedColorRgb = parse(expectedHexes[i]) as Rgb;

            expect(colorMapFunc(normalizedValue)).toStrictEqual([
                (expectedColorRgb.r ?? 0) * 255,
                (expectedColorRgb.g ?? 0) * 255,
                (expectedColorRgb.b ?? 0) * 255,
                (expectedColorRgb.alpha ?? 1) * 255,
            ]);
        }
    });
});
