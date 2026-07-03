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
    const [timeString, setTimeString] = React.useState<string>(timeAgo(Date.now() - props.datetimeMs, props.shorten));

    React.useEffect(
        function updateTimeString() {
            setTimeString(timeAgo(Date.now() - props.datetimeMs, props.shorten));

            function update() {
                setTimeString(timeAgo(Date.now() - props.datetimeMs, props.shorten));
            }

            const intervalId = setInterval(update, props.updateIntervalMs ?? 30000);

            return () => clearInterval(intervalId);
        },
        [props.datetimeMs, props.updateIntervalMs, props.shorten],
    );

    return <> {timeString} </>;
}
