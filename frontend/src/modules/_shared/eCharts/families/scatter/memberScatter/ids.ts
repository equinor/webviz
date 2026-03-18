import { makeRealizationSeriesId } from "../../../utils/seriesId";

export function makeMemberScatterSeriesId(
    highlightGroupKey: string,
    memberKey: number | string,
    axisIndex: number,
): string {
    return makeRealizationSeriesId(highlightGroupKey, memberKey, axisIndex);
}