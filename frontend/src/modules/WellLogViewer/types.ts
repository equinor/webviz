import { TemplatePlot, TemplateTrack } from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";

/**
 * Extension of the SS-comp library type to add some state types to help with editing settings
 */
export type TemplatePlotConfig = Partial<TemplatePlot> & {
    // Used for state updates
    _id: string;
    // Wether the config has all required fields for it's curve-type
    _isValid: boolean;
    // This is used as the value for dropdowns. Even if the curvename is supposed to be unique,  In some rare cases, the curvename is duplicated across different well-logs.
    _logAndName: `${string}::${string}`;
    _logAndName2?: `${string}::${string}`;
};

/**
 * Extension of the SS-comp library type to add some state types to help with editing settings
 */
export type TemplateTrackConfig = Omit<TemplateTrack, "plots"> & {
    // ID used to allow the settings-menu to drag-sort them
    _id: string;
    plots: TemplatePlotConfig[];
};
