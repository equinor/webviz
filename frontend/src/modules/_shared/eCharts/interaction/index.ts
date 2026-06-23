export type {
    HoveredSeriesInfo,
    InteractionSeries,
    InteractionSeriesEntry,
    MemberSeriesInteractionEntry,
    PointAnnotationInteractionSeriesEntry,
    ReferenceLineInteractionSeriesEntry,
    StatisticInteractionSeriesEntry,
} from "./types";
export { makeInteractionLookupKey } from "./types";
export {
    formatScatterInteractionTooltip,
    formatTimeseriesInteractionTooltip,
    resolveSeriesLabel,
} from "./tooltipFormatters";
export { buildHoveredSeriesInfo } from "./hoveredSeriesInfo";
export { findClosestSeriesEntryByValue, resolveClosestSeriesEntry } from "./hitTesting";
export type { ResolvedTarget } from "./hitTesting";