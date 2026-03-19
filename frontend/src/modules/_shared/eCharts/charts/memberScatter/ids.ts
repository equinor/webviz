export const MEMBER_SCATTER_CATEGORY = "memberScatter";

/**
 * Format: chartType|role|groupKey|memberKey|axisIndex
 */
export function makeMemberScatterSeriesId(
    highlightGroupKey: string,
    memberKey: number | string,
    axisIndex: number,
): string {
    return `${MEMBER_SCATTER_CATEGORY}|member|${highlightGroupKey}|${String(memberKey)}|${axisIndex}`;
}