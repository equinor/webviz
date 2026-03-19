export function makeMemberScatterSeriesId(
    highlightGroupKey: string,
    memberKey: number | string,
    axisIndex: number,
): string {
    return `member:${highlightGroupKey}:${String(memberKey)}:${axisIndex}`;
}