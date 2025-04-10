import type { TemplatePlotType } from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";

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
