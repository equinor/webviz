import type { TemplatePlotType } from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";
import type { WellLogCurve } from "@webviz/well-log-viewer/dist/components/WellLogTypes";

import type { DropdownOption } from "@lib/components/Dropdown";

type PlotDropdownOption = DropdownOption<TemplatePlotType>;

export const PLOT_TYPE_OPTIONS: PlotDropdownOption[] = [
    { value: "line", label: "Line" },
    { value: "linestep", label: "Linestep" },
    { value: "dot", label: "Dot" },
    { value: "area", label: "Area" },
    { value: "gradientfill", label: "Gradientfill" },
    { value: "differential", label: "Differential" },
];
export const MAIN_AXIS_CURVE: WellLogCurve = {
    name: "RKB",
    unit: "M",
    dimensions: 1,
    valueType: "float",
};

export const SECONDARY_AXIS_CURVE: WellLogCurve = {
    name: "MSL",
    unit: "M",
    dimensions: 1,
    valueType: "float",
};
