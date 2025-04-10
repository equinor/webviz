import type { TemplateTrack } from "@modules/WellLogViewer/types";
import type { GroupType } from "@modules/_shared/DataProviderFramework/groups/groupTypes";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import {
    type DataProviderVisualization, // type GroupPropCollectorArgs,
    type VisualizationGroup,
    VisualizationItemType,
    type VisualizationTarget, // VisualizationGroup,
    // VisualizationTarget,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import type { TemplatePlotScale } from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";

// import type { ContinuousTrackSettings } from "../groups/ContinuousLogTrack";

type TrackCustomPropsCollector = any;
// type TrackCustomPropsCollector = GroupPropCollectorArgs<ContinuousTrackSettings>;

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

// type BasicViewVisualization =   <VisualizationTarget.WSC_WELL_LOG, TemplateTrack>;

// type ViewVisualization = BasicViewVisualization;
// type TrackVisualization = BasicViewVisualization & TemplateTrack;

// export type TrackVisualization = VisualizationGroup< DataProviderVisualization<VisualizationTarget.WSC_WELL_LOG, WellPickProps>;
//     item: VisualizationGroup<any> | DataProviderVisualization<any>,

export type TrackVisualizationGroup = VisualizationGroup<
    VisualizationTarget.WSC_WELL_LOG,
    {
        [GroupType.WELL_LOG_TRACK]: TemplateTrack;
        [GroupType.VIEW]: any;
    },
    never,
    GroupType.WELL_LOG_TRACK
>;

export function isTrackGroup(
    item: VisualizationGroup<any, any, any, any> | DataProviderVisualization<any, any>,
): item is TrackVisualizationGroup {
    if (item.itemType !== VisualizationItemType.GROUP) return false;

    // TODO: Check item.providerType once that's implemented
    return "plots" in item.customProps;
}
