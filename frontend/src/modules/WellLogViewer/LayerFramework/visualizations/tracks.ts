import type { TemplateTrack } from "@modules/WellLogViewer/types";
import { Setting } from "@modules/_shared/LayerFramework/settings/settingsDefinitions";
import type {
    TargetViewReturnTypes,
    ViewDataCollectorFunction,
    VisualizationTarget,
    VisualizationViewBasic,
} from "@modules/_shared/LayerFramework/visualization/VisualizationFactory";
import type { TemplatePlotScale } from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";

import type { ContinuousTrackSettings } from "../groups/ContinuousLogTrack";

export const makeContinuousTrackConfig: ViewDataCollectorFunction<
    ContinuousTrackSettings,
    VisualizationTarget.WSC_WELL_LOG
> = (args) => {
    const trackWidth = args.getSetting(Setting.TRACK_WIDTH) ?? undefined;
    const trackScale = args.getSetting(Setting.SCALE) ?? undefined;

    return {
        title: args.name,
        required: true,
        width: trackWidth,
        scale: trackScale as TemplatePlotScale,
        // Need to fill this later, as they're not defined yet.
        plots: [],
    };
};

type BasicViewVisualization = VisualizationViewBasic<VisualizationTarget.WSC_WELL_LOG>;

type ViewVisualization = BasicViewVisualization & TargetViewReturnTypes[VisualizationTarget.WSC_WELL_LOG];
type TrackVisualization = BasicViewVisualization & TemplateTrack;

export function isTrackGroup(groupVisualization: ViewVisualization): groupVisualization is TrackVisualization {
    if (groupVisualization == null) return false;

    return "plots" in groupVisualization;
}
