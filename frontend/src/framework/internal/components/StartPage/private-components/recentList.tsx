import React from "react";

import { Icon } from "@equinor/eds-core-react";
import { folder_open } from "@equinor/eds-icons";
import { Refresh } from "@mui/icons-material";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";

import { useRefreshQuery } from "@framework/internal/hooks/useRefreshQuery";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Heading } from "@lib/components/Heading";
import { TimeAgo } from "@lib/components/TimeAgo/timeAgo";
import { Tooltip } from "@lib/components/Tooltip";
import { Typography } from "@lib/components/Typography";

Icon.add({ folder_open });

export type RecentListProps<TItemType, TQueryData = unknown> = {
    title: string;
    useQueryOptions: UseQueryOptions<TQueryData, any, any, any>;
    transformData: (data: TQueryData) => TItemType[];
    refetchIntervalMs?: number;
    renderItem: (item: TItemType) => React.ReactNode;
    makeItemKey: (item: TItemType) => string;
    onDialogIconClick?: () => void;
};

export function RecentList<TItemType, TQueryData = unknown>(
    props: RecentListProps<TItemType, TQueryData>,
): React.ReactNode {
    const [lastUpdatedMs, setLastUpdatedMs] = React.useState<number | null>(null);

    const itemsQuery = useQuery<TQueryData, any, any, any>({
        ...props.useQueryOptions,
        refetchInterval: props.refetchIntervalMs ?? 60000,
    });

    const { isRefreshing, refresh } = useRefreshQuery(itemsQuery);

    const isFirstTimeFetching = itemsQuery.status === "pending" || lastUpdatedMs === null;

    // Update lastUpdatedMs when query succeeds
    React.useEffect(
        function updateLastUpdatedTime() {
            if (itemsQuery.isSuccess && itemsQuery.dataUpdatedAt > (lastUpdatedMs ?? 0)) {
                setLastUpdatedMs(itemsQuery.dataUpdatedAt);
            }
        },
        [itemsQuery.isSuccess, itemsQuery.dataUpdatedAt, lastUpdatedMs],
    );

    function makeContent() {
        if (isFirstTimeFetching) {
            if (itemsQuery.status === "pending") {
                return (
                    <span className="flex gap-2 text-gray-500">
                        <CircularProgress size="extra-small" /> Loading recent items...
                    </span>
                );
            }

            if (itemsQuery.status === "error") {
                return <span className="text-red-800">Could not fetch recent items...</span>;
            }
        }

        if (itemsQuery.status === "success" && itemsQuery.data) {
            const transformedData = props.transformData(itemsQuery.data);

            if (transformedData.length === 0) {
                return <span className="flex h-full flex-col justify-center text-gray-400 italic">None found.</span>;
            }
            return (
                <>
                    <ul>
                        {transformedData.map(function renderListItem(item) {
                            return <li key={props.makeItemKey(item)}>{props.renderItem(item)}</li>;
                        })}
                    </ul>
                </>
            );
        }
    }

    return (
        <section className="flex flex-col gap-1">
            <div className="gap-space-xs flex items-center">
                <Heading as="h4" className="grow">
                    {props.title}
                </Heading>
                <Tooltip title="Refresh" placement="bottom" enterDelay="medium">
                    <Button size="small" tone="neutral" variant="text" iconOnly onClick={refresh}>
                        {isRefreshing ? (
                            <CircularProgress size="medium-small" color="fill-indigo-800" />
                        ) : (
                            <Refresh fontSize="small" className="text-indigo-800" />
                        )}
                    </Button>
                </Tooltip>
                <Tooltip title="Show all" placement="bottom" enterDelay="medium">
                    <Button size="small" tone="neutral" variant="text" iconOnly onClick={props.onDialogIconClick}>
                        <Icon name="folder_open" className="h-5 text-indigo-800" />
                    </Button>
                </Tooltip>
            </div>
            <Typography size="sm" family="body" className="text-text-neutral-subtle">
                Last updated:{" "}
                {lastUpdatedMs ? <TimeAgo datetimeMs={lastUpdatedMs} updateIntervalMs={10000} /> : "Never"}
            </Typography>
            <div className="mt-2 flex min-h-16 flex-col gap-2">{makeContent()}</div>
        </section>
    );
}
