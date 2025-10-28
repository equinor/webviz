import React from "react";

import { Typography } from "@equinor/eds-core-react";
import { CircularProgress } from "@lib/components/CircularProgress";
import { DenseIconButton } from "@lib/components/DenseIconButton";
import { TimeAgo } from "@lib/components/TimeAgo/timeAgo";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Refresh } from "@mui/icons-material";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";

export type RecentListProps<TItemType, TQueryData = unknown, TError = Error> = {
    title: string;
    useQueryOptions: Omit<UseQueryOptions<TQueryData, TError, TQueryData, any>, "refetchInterval">;
    transformData: (data: TQueryData) => TItemType[];
    refetchIntervalMs?: number;
    renderItem: (item: TItemType) => React.ReactNode;
    makeItemKey: (item: TItemType) => string;
};

export function RecentList<TItemType, TQueryData = unknown>(
    props: RecentListProps<TItemType, TQueryData>,
): React.ReactNode {
    const [isManualRefetch, setIsManualRefetch] = React.useState<boolean>(false);
    const [isRefreshAnimationPlaying, setIsRefreshAnimationPlaying] = React.useState<boolean>(false);
    const [lastUpdatedMs, setLastUpdatedMs] = React.useState<number | null>(null);

    const itemsQuery = useQuery<TQueryData>({
        ...props.useQueryOptions,
        refetchInterval: props.refetchIntervalMs ?? 60000,
    });

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

    // Handle manual refresh animation
    React.useEffect(
        function handleRefreshAnimation() {
            if (isManualRefetch && !itemsQuery.isFetching) {
                setIsManualRefetch(false);
                setTimeout(function stopRefreshAnimation() {
                    setIsRefreshAnimationPlaying(false);
                }, 900);
            }
        },
        [isManualRefetch, itemsQuery.isFetching],
    );

    function handleRefreshClick() {
        if (itemsQuery.isFetching) {
            return;
        }
        setIsManualRefetch(true);
        setIsRefreshAnimationPlaying(true);
        itemsQuery.refetch();
    }

    function makeContent() {
        if (isFirstTimeFetching) {
            if (itemsQuery.status === "pending") {
                return (
                    <span className="text-gray-500 flex gap-2">
                        <CircularProgress size="extra-small" /> Loading recent sessions...
                    </span>
                );
            }

            if (itemsQuery.status === "error") {
                return <span className="text-red-800">Could not fetch recent sessions...</span>;
            }
        }

        if (itemsQuery.status === "success" && itemsQuery.data) {
            const transformedData = props.transformData(itemsQuery.data);
            return (
                <ul>
                    {transformedData.map(function renderListItem(item) {
                        return <li key={props.makeItemKey(item)}>{props.renderItem(item)}</li>;
                    })}
                </ul>
            );
        }

        return <div className="text-gray-500">No recent sessions found.</div>;
    }

    return (
        <section className="flex gap-1 flex-col">
            <div className="flex items-center gap-2 justify-between">
                <Typography className="flex gap-1 items-center justify-between" variant="h3">
                    {props.title}
                </Typography>
                <DenseIconButton onClick={handleRefreshClick}>
                    <Refresh
                        fontSize="small"
                        className={resolveClassNames({ "animate-spin": isRefreshAnimationPlaying })}
                    />
                </DenseIconButton>
            </div>
            <span className="text-gray-500 text-xs">
                Last updated: <TimeAgo datetimeMs={lastUpdatedMs ?? Date.now()} updateIntervalMs={10000} />
            </span>
            <div className="flex flex-col gap-2 mt-2">{makeContent()}</div>
        </section>
    );
}
