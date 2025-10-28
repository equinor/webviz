import React from "react";

import { timeAgo } from "@lib/utils/dates";

export type TimeAgoProps = {
    datetimeMs: number;
    updateIntervalMs?: number;
};

export function TimeAgo(props: TimeAgoProps): React.ReactNode {
    const [timeString, setTimeString] = React.useState<string>(timeAgo(Date.now() - props.datetimeMs));

    React.useEffect(
        function updateTimeString() {
            setTimeString(timeAgo(Date.now() - props.datetimeMs));

            function update() {
                setTimeString(timeAgo(Date.now() - props.datetimeMs));
            }

            const intervalId = setInterval(update, props.updateIntervalMs ?? 30000);

            return () => clearInterval(intervalId);
        },
        [props.datetimeMs, props.updateIntervalMs],
    );

    return <> {timeString} </>;
}
