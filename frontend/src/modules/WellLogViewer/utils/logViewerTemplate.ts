import { Template } from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";

import { MAIN_AXIS_CURVE } from "./queryDataTransform";

export function createLogTemplate(selectedCurveNames: string[]): Template {
    return {
        name: "Template test",
        scale: { primary: MAIN_AXIS_CURVE.name, allowSecondary: true },
        // TODO: User should configure the tracks themselves
        tracks: selectedCurveNames.map((c) => {
            return {
                title: c,
                plots: [{ name: c, type: "line", color: "rgb(12,24,233)" }],
            };
        }),
    };
}
