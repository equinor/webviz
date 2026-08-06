import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";

export function makeRftPlotTitle(
    wellName: string | null,
    responseName: string | null,
    timestampUtcMs: number | null,
): string {
    if (!wellName || !responseName) {
        return "RFT";
    }

    const dateTitle = timestampUtcMs !== null ? `, ${timestampUtcMsToCompactIsoString(timestampUtcMs)}` : "";
    return `RFT: ${responseName} for ${wellName}${dateTitle}`;
}
