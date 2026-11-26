import { describe, expect, test, vi } from "vitest";

import { PhaseType, PressureDependentVariable } from "@modules/Pvt/typesAndEnums";
import { PvtDataAccessor } from "@modules/Pvt/utils/PvtDataAccessor";
import { PvtPlotBuilder } from "@modules/Pvt/utils/PvtPlotBuilder";

function makeBuilder(): PvtPlotBuilder {
    const accessor = new PvtDataAccessor([]);
    vi.spyOn(accessor, "getPressureUnit").mockReturnValue("bar");
    vi.spyOn(accessor, "getDependentVariableUnit").mockImplementation((variable) =>
        variable === PressureDependentVariable.DENSITY ? "kg/m3" : "cP",
    );
    return new PvtPlotBuilder(accessor, () => "Ensemble");
}

describe("PVT axis titles", () => {
    test("uses Plotly 4 title objects for a single subplot", () => {
        const builder = makeBuilder();
        builder.makeLayout(PhaseType.OIL, [PressureDependentVariable.DENSITY], { width: 800, height: 600 });

        const layout = builder.makePlotLayout();
        expect(layout.xaxis1?.title).toMatchObject({ text: "Pressure [bar]" });
        expect(layout.yaxis1?.title).toMatchObject({ text: "[kg/m3]" });
    });

    test("labels only the bottom axes in an uneven grid", () => {
        const builder = makeBuilder();
        builder.makeLayout(
            PhaseType.OIL,
            [
                PressureDependentVariable.DENSITY,
                PressureDependentVariable.VISCOSITY,
                PressureDependentVariable.FORMATION_VOLUME_FACTOR,
            ],
            { width: 800, height: 600 },
        );

        const layout = builder.makePlotLayout();
        expect(layout.xaxis1?.title).toBeUndefined();
        expect(layout.xaxis2?.title).toMatchObject({ text: "Pressure [bar]" });
        expect(layout.xaxis3?.title).toMatchObject({ text: "Pressure [bar]" });
        expect(layout.yaxis1?.title).toMatchObject({ text: "[kg/m3]" });
        expect(layout.yaxis2?.title).toMatchObject({ text: "[cP]" });
        expect(layout.yaxis3?.title).toMatchObject({ text: "[cP]" });
    });
});
