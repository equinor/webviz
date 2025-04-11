import type { TemplateTrack } from "@modules/WellLogViewer/types";
import { GroupType } from "@modules/_shared/DataProviderFramework/groups/groupTypes";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type {
    DataProviderVisualization,
    GroupPropsCollectorArgs,
    VisualizationGroup,
    VisualizationTarget,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { VisualizationItemType } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import type { TemplatePlotScale } from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";

import type { ContinuousTrackSettings } from "../groups/ContinuousLogTrack";

type TrackCustomPropsCollector = GroupPropsCollectorArgs<ContinuousTrackSettings>;

export function makeContinuousTrackConfig(args: TrackCustomPropsCollector): TemplateTrack {
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
}

export type TrackVisualizationGroup = VisualizationGroup<
    VisualizationTarget.WSC_WELL_LOG,
    { [GroupType.WELL_LOG_TRACK_CONT]: TemplateTrack },
    never,
    GroupType.WELL_LOG_TRACK_CONT
>;

export function isTrackGroup(
    item: VisualizationGroup<any, any, any, any> | DataProviderVisualization<any, any>,
): item is TrackVisualizationGroup {
    if (item.itemType !== VisualizationItemType.GROUP) return false;

    return [GroupType.WELL_LOG_TRACK_CONT, GroupType.WELL_LOG_TRACK_DISC].includes(item.groupType);
}
