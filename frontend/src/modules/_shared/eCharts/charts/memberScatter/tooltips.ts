import type { CallbackDataParams } from "echarts/types/dist/shared";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { extractPointValue, formatCompactTooltip } from "../../core/tooltip";
import { getSeriesMemberKey } from "../../utils/seriesMetadata";

export type MemberScatterTooltipOptions = {
    memberLabel?: string;
};

export function buildMemberScatterTooltip(options: MemberScatterTooltipOptions = {}) {
    return {
        trigger: "item" as const,
        formatter: (params: CallbackDataParams | CallbackDataParams[]) => formatMemberScatterItemTooltip(params, options),
    };
}

export function formatMemberScatterItemTooltip(
    params: CallbackDataParams | CallbackDataParams[],
    options: MemberScatterTooltipOptions = {},
): string {
    const p = Array.isArray(params) ? params[0] : params;
    if (!p) return "";

    // Safely extract from p.data, falling back to metadata just in case
    const dataObj = p.data as { memberId?: string | number } | undefined;
    const memberId = dataObj?.memberId ?? getSeriesMemberKey(p);

    const point = extractPointValue(p.value);
    const memberLabel = options.memberLabel ?? "Member";

    const rows: Array<{ label: string; value: string; color?: string }> = [];
    if (point) {
        rows.push({ label: "X", value: formatNumber(point[0]) });
        rows.push({ label: "Y", value: formatNumber(point[1]) });
    }
    if (memberId != null) {
        rows.push({ label: memberLabel, value: String(memberId), color: typeof p.color === "string" ? p.color : undefined });
    }

    return formatCompactTooltip(p.seriesName ?? "", rows);
}