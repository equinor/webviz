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
import type { DiscreteTrackSettings } from "../groups/DiscreteLogTrack";
import type { baseSettings } from "../groups/_shared";

type DiscreteTrackCollectorArgs = GroupPropsCollectorArgs<DiscreteTrackSettings>;
type ContinuousTrackCollectorArgs = GroupPropsCollectorArgs<ContinuousTrackSettings>;

function getSharedConfig(args: GroupPropsCollectorArgs<typeof baseSettings>): TemplateTrack {
    return {
        title: args.name,
        width: args.getSetting(Setting.TRACK_WIDTH) ?? undefined,
        required: true,
        // Need to fill this later, as they're not defined yet.
        plots: [],
    };
}

export function collectDiscreteTrackConfig(args: DiscreteTrackCollectorArgs): TemplateTrack {
    return {
        ...getSharedConfig(args),
    };
}

export function collectContinuousTrackConfig(args: ContinuousTrackCollectorArgs): TemplateTrack {
    const trackScale = args.getSetting(Setting.SCALE) ?? undefined;

    return {
        ...getSharedConfig(args),
        scale: trackScale as TemplatePlotScale,
    };
}

export type TrackVisualizationGroup = VisualizationGroup<
    VisualizationTarget.WSC_WELL_LOG,
    { [GroupType.WELL_LOG_TRACK_CONT]: TemplateTrack },
    never,
    GroupType.WELL_LOG_TRACK_CONT | GroupType.WELL_LOG_TRACK_DISC
>;

export function isTrackGroup(
    item: VisualizationGroup<any, any, any, any> | DataProviderVisualization<any, any>,
): item is TrackVisualizationGroup {
    if (item.itemType !== VisualizationItemType.GROUP) return false;

    return [GroupType.WELL_LOG_TRACK_CONT, GroupType.WELL_LOG_TRACK_DISC].includes(item.groupType);
}
