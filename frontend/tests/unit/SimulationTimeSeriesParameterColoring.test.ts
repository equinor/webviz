import { describe, expect, test } from "vitest";

import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import type { Parameter } from "@framework/EnsembleParameters";
import { ParameterIdent, ParameterType } from "@framework/EnsembleParameters";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { ColorPalette } from "@lib/utils/ColorPalette";
import { ColorScale, ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";
import { EnsemblesParameterColoring } from "@modules/SimulationTimeSeries/view/utils/ensemblesContinuousParameterColoring";

const NUMERIC_DISCRETE_PARAMETER_IDENT = ParameterIdent.fromNameAndGroup("numeric discrete parameter", null);

function makeColorScale(): ColorScale {
    return new ColorScale({
        colorPalette: new ColorPalette({
            id: "test",
            name: "test",
            colors: ["#000000", "#ffffff"],
        }),
        gradientType: ColorScaleGradientType.Sequential,
        type: ColorScaleType.Continuous,
        steps: 2,
    });
}

function makeRegularEnsemble(name: string, values: number[], realizations: number[] = [1, 2, 3]): RegularEnsemble {
    const parameter: Parameter = {
        type: ParameterType.DISCRETE,
        name: NUMERIC_DISCRETE_PARAMETER_IDENT.name,
        groupName: NUMERIC_DISCRETE_PARAMETER_IDENT.groupName,
        description: null,
        isConstant: false,
        isNumerical: true,
        realizations,
        values,
    };

    return new RegularEnsemble(
        "DROGON",
        ["DROGON"],
        `11111111-aaaa-4444-aaaa-${name}`,
        "Case",
        name,
        "stratigraphicColumn",
        realizations,
        [parameter],
        null,
        null,
        "#000000",
    );
}

function makeDeltaEnsemble(
    comparison: { values: number[]; realizations: number[] },
    reference: { values: number[]; realizations: number[] },
): DeltaEnsemble {
    const comparisonEnsemble = makeRegularEnsemble("aaaaaaaaaaaa", comparison.values, comparison.realizations);
    const referenceEnsemble = makeRegularEnsemble("bbbbbbbbbbbb", reference.values, reference.realizations);
    return new DeltaEnsemble(comparisonEnsemble, referenceEnsemble, "#000000");
}

describe("EnsemblesParameterColoring", () => {
    test("supports numeric discrete parameters", () => {
        const firstEnsemble = makeRegularEnsemble("aaaaaaaaaaaa", [1, 2, 3]);
        const secondEnsemble = makeRegularEnsemble("bbbbbbbbbbbb", [4, 5, 6]);
        const colorScale = makeColorScale();

        const coloring = new EnsemblesParameterColoring(
            [firstEnsemble, secondEnsemble],
            NUMERIC_DISCRETE_PARAMETER_IDENT,
            colorScale,
        );

        expect(coloring.hasParameterForEnsemble(firstEnsemble.getIdent())).toBe(true);
        expect(coloring.hasParameterRealizationValue(firstEnsemble.getIdent(), 2)).toBe(true);
        expect(coloring.getParameterRealizationValue(firstEnsemble.getIdent(), 2)).toBe(2);
        expect(colorScale.getMin()).toBe(1);
        expect(colorScale.getMax()).toBe(6);
    });

    test("delta ensemble uses comparison values for shared realizations only", () => {
        const delta = makeDeltaEnsemble(
            { values: [10, 20, 30, 40], realizations: [1, 2, 3, 4] },
            { values: [100, 200, 300, 400], realizations: [3, 4, 5, 6] },
        );
        const colorScale = makeColorScale();

        const coloring = new EnsemblesParameterColoring([delta], NUMERIC_DISCRETE_PARAMETER_IDENT, colorScale);

        expect(coloring.hasParameterForEnsemble(delta.getIdent())).toBe(true);
        expect(coloring.hasParameterRealizationValue(delta.getIdent(), 1)).toBe(false);
        expect(coloring.hasParameterRealizationValue(delta.getIdent(), 5)).toBe(false);
        expect(coloring.getParameterRealizationValue(delta.getIdent(), 3)).toBe(30);
        expect(coloring.getParameterRealizationValue(delta.getIdent(), 4)).toBe(40);
        expect(colorScale.getMin()).toBe(30);
        expect(colorScale.getMax()).toBe(40);
    });

    test("delta ensemble with no shared realizations has no parameter and falls back to range [0, 0]", () => {
        const delta = makeDeltaEnsemble(
            { values: [1, 2], realizations: [1, 2] },
            { values: [3, 4], realizations: [3, 4] },
        );
        const colorScale = makeColorScale();

        const coloring = new EnsemblesParameterColoring([delta], NUMERIC_DISCRETE_PARAMETER_IDENT, colorScale);

        expect(coloring.hasParameterForEnsemble(delta.getIdent())).toBe(false);
        expect(colorScale.getMin()).toBe(0);
        expect(colorScale.getMax()).toBe(0);
        expect(colorScale.getDivMidPoint()).toBe(0);

        const colorStops = colorScale.getColorStops();
        expect(colorStops.map((stop) => stop.offset)).toEqual([0, 1]);
    });

    test("delta ensemble with a single shared realization gives a zero-width range with valid color stops", () => {
        const delta = makeDeltaEnsemble(
            { values: [10, 20], realizations: [1, 2] },
            { values: [30, 40], realizations: [2, 3] },
        );
        const colorScale = makeColorScale();

        const coloring = new EnsemblesParameterColoring([delta], NUMERIC_DISCRETE_PARAMETER_IDENT, colorScale);

        expect(coloring.hasParameterForEnsemble(delta.getIdent())).toBe(true);
        expect(coloring.getParameterRealizationValue(delta.getIdent(), 2)).toBe(20);
        expect(colorScale.getMin()).toBe(20);
        expect(colorScale.getMax()).toBe(20);

        const colorStops = colorScale.getColorStops();
        expect(colorStops.map((stop) => stop.offset)).toEqual([0, 1]);
        expect(colorStops.every((stop) => Number.isFinite(stop.offset))).toBe(true);
    });
});
