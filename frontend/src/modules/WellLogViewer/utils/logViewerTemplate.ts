import { DropdownOption } from "@lib/components/Dropdown";
import {
    Template,
    TemplatePlotScaleTypes,
    TemplatePlotTypes,
} from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";

import { MAIN_AXIS_CURVE } from "./queryDataTransform";

import { TemplateTrackConfig } from "../settings/atoms/baseAtoms";

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

    // Type requires to named curves, don't know how to do the flow for that
    { value: "differential", label: "Differential" },
    { value: "stacked", label: "Stacked" },
];

export function isCompositePlotType(type: TemplatePlotTypes) {
    return ["differential", "stacked"].includes(type);
}

export function createLogTemplate(templateTrackConfigs: TemplateTrackConfig[]): Template {
    return {
        name: "Template test",
        scale: { primary: MAIN_AXIS_CURVE.name, allowSecondary: true },
        tracks: templateTrackConfigs,
    };
}
