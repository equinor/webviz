import { makeSeriesId } from "../../core/seriesId";

export const MEMBER_SCATTER_CATEGORY = "memberScatter";

export function makeMemberScatterSeriesId(
    highlightGroupKey: string,
    memberKey: number | string,
    axisIndex: number,
): string {
    return makeSeriesId({ chartType: MEMBER_SCATTER_CATEGORY, role: "member", name: highlightGroupKey, subKey: String(memberKey), axisIndex });
}