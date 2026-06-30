import React from "react";

import { timeAgo } from "@lib/utils/dates";

export type TimeAgoProps = {
    datetimeMs: number;
    updateIntervalMs?: number;
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

    const timeString = React.useMemo(
        () => timeAgo(time - props.datetimeMs, props.shorten),
        [props.datetimeMs, props.shorten, time],
    );

    return <> {timeString} </>;
}
