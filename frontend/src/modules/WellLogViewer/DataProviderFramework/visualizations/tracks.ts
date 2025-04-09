import type { TemplateTrack } from "@modules/WellLogViewer/types";
import type { GroupType } from "@modules/_shared/DataProviderFramework/groups/groupTypes";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type {
    GroupCustomPropsCollector,
    VisualizationGroup,
    VisualizationTarget,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import type { TemplatePlotScale } from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";

import type { ContinuousTrackSettings } from "../groups/ContinuousLogTrack";

export const makeContinuousTrackConfig: GroupCustomPropsCollector<
    ContinuousTrackSettings,
    GroupType.WELL_LOG_TRACK,
    Record<string, TemplateTrack>
> = function makeContinuousTrackConfig(args) {
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

type BasicViewVisualization = VisualizationGroup<VisualizationTarget.WSC_WELL_LOG>;

// type ViewVisualization = BasicViewVisualization;
type TrackVisualization = BasicViewVisualization & TemplateTrack;

export function isTrackGroup(groupVisualization: unknown): groupVisualization is TrackVisualization {
    if (groupVisualization == null || typeof groupVisualization !== "object") return false;

    return "plots" in groupVisualization;
}
