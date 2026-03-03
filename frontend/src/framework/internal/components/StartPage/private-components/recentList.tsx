import React from "react";

import { Icon, Typography } from "@equinor/eds-core-react";
import { folder_open } from "@equinor/eds-icons";
import { Refresh } from "@mui/icons-material";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";

import { useRefreshQuery } from "@framework/internal/hooks/useRefreshQuery";
import { CircularProgress } from "@lib/components/CircularProgress";
import { DenseIconButton } from "@lib/components/DenseIconButton";
import { TimeAgo } from "@lib/components/TimeAgo/timeAgo";
import { Tooltip } from "@lib/components/Tooltip";

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
                    <span className="text-gray-500 flex gap-2">
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
                return <span className="text-gray-400 italic h-full flex flex-col justify-center">None found.</span>;
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
        <section className="flex gap-1 flex-col">
            <div className="flex items-center gap-2">
                <Typography variant="h3" className="grow">
                    {props.title}
                </Typography>
                <Tooltip title="Refresh" placement="bottom" enterDelay="medium">
                    <DenseIconButton onClick={refresh}>
                        {isRefreshing ? (
                            <CircularProgress size="medium-small" color="fill-indigo-800" />
                        ) : (
                            <Refresh fontSize="small" className="text-indigo-800" />
                        )}
                    </DenseIconButton>
                </Tooltip>
                <Tooltip title="Show all" placement="bottom" enterDelay="medium">
                    <DenseIconButton onClick={props.onDialogIconClick}>
                        <Icon name="folder_open" className="text-indigo-800 h-5" />
                    </DenseIconButton>
                </Tooltip>
            </div>
            <span className="text-gray-500 text-xs">
                Last updated:{" "}
                {lastUpdatedMs ? <TimeAgo datetimeMs={lastUpdatedMs} updateIntervalMs={10000} /> : "Never"}
            </span>
            <div className="flex flex-col gap-2 mt-2 min-h-16">{makeContent()}</div>
        </section>
    );
}
