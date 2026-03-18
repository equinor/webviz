export function makeMemberScatterSeriesId(
    highlightGroupKey: string,
    memberKey: number | string,
    axisIndex: number,
): string {
    return `realization:${highlightGroupKey}:${String(memberKey)}:${axisIndex}`;
}