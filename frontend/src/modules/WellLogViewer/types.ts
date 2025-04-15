import type { WellLogCurveTypeEnum_api, WellboreLogCurveHeader_api } from "@api";
import type {
    TemplatePlot as TemplatePlotSSC,
    Template as TemplateSSC,
    TemplateTrack as TemplateTrackSSC,
} from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";

/**
 * The well-log viewer does not allow any distinction to which log a curve should be taken from. We add this as an
 * extension to the type, so it can be used in a later workaround (see `logViewerTemplate.ts`)
 */
export type TemplatePlot = TemplatePlotSSC & {
    logName: string;
    logName2?: string;
};

export type TemplateTrack = Omit<TemplateTrackSSC, "plots"> & {
    plots: TemplatePlot[];
};

export type Template = Omit<TemplateSSC, "tracks"> & {
    tracks: TemplateTrack[];
};

/**
 * Extension of the SS-comp library type to add some state types to help with editing settings
 * @deprecated
 */
export type TemplatePlotConfig = Partial<TemplatePlot> & {
    // Used for state updates
    _key: string;
    // Wether the config has all required fields for it's curve-type
    _isValid: boolean;
    // This is used as the value for dropdowns. Even if the curvename is supposed to be unique,  In some rare cases, the curvename is duplicated across different well-logs.
    // The source of the fields data
    _curveHeader: WellboreLogCurveHeader_api | null;
    _curveHeader2?: WellboreLogCurveHeader_api | null;
};

/**
 * Extension of the SS-comp library type to add some state types to help with editing settings
 * @deprecated
 */
export type TemplateTrackConfig = ContinuousTemplateTrackConfig | DiscreteTemplateTrackConfig;

/**
 * @deprecated
 */
export type ContinuousTemplateTrackConfig = Omit<TemplateTrack, "plots"> & {
    // ID used to allow the settings-menu to drag-sort them
    _key: string;
    _type: WellLogCurveTypeEnum_api.CONTINUOUS;
    plots: TemplatePlotConfig[];
};

/**
 * @deprecated
 */
export type DiscreteTemplateTrackConfig = Omit<TemplateTrack, "plots"> & {
    // ID used to allow the settings-menu to drag-sort them
    _key: string;
    _type: WellLogCurveTypeEnum_api.DISCRETE;
    // ! Discrete tracks only support a single plot, currently
    plots: [TemplatePlotConfig];
};
