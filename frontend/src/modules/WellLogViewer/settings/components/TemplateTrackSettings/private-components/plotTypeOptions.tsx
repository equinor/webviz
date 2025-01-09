import { DropdownOption } from "@lib/components/Dropdown";
import { TemplatePlotTypes } from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";

type PlotDropdownOption = DropdownOption<TemplatePlotTypes>;
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
