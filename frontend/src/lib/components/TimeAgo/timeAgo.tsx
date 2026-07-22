import React from "react";

import { timeAgo } from "@lib/utils/dates";

export type TimeAgoProps = {
    /** The timestamp in milliseconds to render relative to now. */
    datetimeMs: number;
    /** How often to re-render the relative time string, in milliseconds. @default 30000 */
    updateIntervalMs?: number;
    /** When true, uses an abbreviated format (e.g. "5m" instead of "5 minutes ago"). */
    shorten?: boolean;
};

export function TimeAgo(props: TimeAgoProps): React.ReactNode {
    const [time, setTime] = React.useState<number>(() => Date.now());

    React.useEffect(
        function updateTimeString() {
            const intervalId = setInterval(() => setTime(Date.now()), props.updateIntervalMs ?? 30000);
            return () => clearInterval(intervalId);
        },
        [props.updateIntervalMs],
    );

    return timeAgo(time - props.datetimeMs, props.shorten);
}
