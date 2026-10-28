import React from "react";

import type { BannerMessage, BannerMessageReporter } from "./PanelBannerMessagesContext";
import { PanelBannerMessagesContext } from "./PanelBannerMessagesContext";

/**
 * Forwards a Setting.Banner's current message to the nearest enclosing `Setting.Panel`. `null` reports
 * nothing. No-ops when no `Setting.Panel` is present.
 */
export function useReportBannerMessage(message: BannerMessage | null): void {
    const bannerId = React.useId();
    const panelReporter = React.useContext(PanelBannerMessagesContext);

    // Depend on the primitives so a new-but-equal message object does not re-report
    const type = message?.type;
    const text = message?.message;

    React.useEffect(
        function reportBannerMessage() {
            if (type === undefined || text === undefined) {
                return;
            }
            report(panelReporter, bannerId, { type, message: text });

            return function retractBannerMessage() {
                report(panelReporter, bannerId, null);
            };
        },
        [bannerId, type, text, panelReporter],
    );
}

function report(reporter: BannerMessageReporter | undefined, bannerId: string, message: BannerMessage | null): void {
    reporter?.(bannerId, message);
}
