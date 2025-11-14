import React from "react";

import { timeAgo } from "@lib/utils/dates";

export type TimeAgoProps = {
    datetimeMs: number;
    updateIntervalMs?: number;
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
