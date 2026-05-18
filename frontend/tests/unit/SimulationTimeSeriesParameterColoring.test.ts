import { describe, expect, test } from "vitest";

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

function makeEnsemble(name: string, values: number[]): RegularEnsemble {
    const parameter: Parameter = {
        type: ParameterType.DISCRETE,
        name: NUMERIC_DISCRETE_PARAMETER_IDENT.name,
        groupName: NUMERIC_DISCRETE_PARAMETER_IDENT.groupName,
        description: null,
        isConstant: false,
        isNumerical: true,
        realizations: [1, 2, 3],
        values,
    };

    return new RegularEnsemble(
        "DROGON",
        ["DROGON"],
        `11111111-aaaa-4444-aaaa-${name}`,
        "Case",
        name,
        "stratigraphicColumn",
        [1, 2, 3],
        [parameter],
        null,
        "#000000",
    );
}

describe("EnsemblesParameterColoring", () => {
    test("supports numeric discrete parameters", () => {
        const firstEnsemble = makeEnsemble("aaaaaaaaaaaa", [1, 2, 3]);
        const secondEnsemble = makeEnsemble("bbbbbbbbbbbb", [4, 5, 6]);
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
});