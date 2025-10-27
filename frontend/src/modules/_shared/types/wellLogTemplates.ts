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
