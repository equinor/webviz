import { DropdownOption } from "@lib/components/Dropdown";
import {
    Template,
    TemplatePlotScaleTypes,
    TemplatePlotTypes,
    TemplateTrack,
} from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";

import { MAIN_AXIS_CURVE } from "./queryDataTransform";

export const PLOT_SCALE_OPTIONS: (DropdownOption & { value: TemplatePlotScaleTypes })[] = [
    { label: "Linear", value: "linear" },
    { label: "Logaritmic", value: "log" },
];

type PlotDropdownOption = DropdownOption & { value: TemplatePlotTypes };

export const PLOT_TYPE_OPTIONS: PlotDropdownOption[] = [
    { value: "line", label: "Line" },
    { value: "linestep", label: "Linestep" },
    { value: "dot", label: "Dot" },
    { value: "area", label: "Area" },
    { value: "gradientfill", label: "Gradientfill" },
    // TODO: Type requires two named curves, ensure the flow for that is good
    { value: "differential", label: "Differential" },

    // This one is completely different; requires "discrete" metadata
    // { value: "stacked", label: "Stacked" },
];

export function isCompositePlotType(type: TemplatePlotTypes) {
    return ["differential"].includes(type);
}

export function createLogTemplate(templateTrackConfigs: TemplateTrack[]): Template {
    return {
        name: "Template test",
        scale: { primary: MAIN_AXIS_CURVE.name, allowSecondary: true },
        tracks: templateTrackConfigs,
    };
}
