import React from "react";

import { useQuery } from "@tanstack/react-query";

import type { GraphUser_api } from "@api";
import { getUserInfoOptions } from "@api";
import { useUserAvatar } from "@framework/internal/utils/useUserAvatar";
import { Tooltip } from "@lib/components/Tooltip";
import { Avatar } from "@lib/newComponents/Avatar";
import { TimeAgo } from "@lib/newComponents/TimeAgo/timeAgo";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Popover } from "@lib/newComponents/Popover";
import { Info } from "@mui/icons-material";
import { Heading } from "@lib/newComponents/Typography/compositions";
import { Separator } from "@lib/newComponents/Separator";

export type ItemCardProps = {
    id: string;
    title: string;
    timestamp: string;
    description: string | null;
    href: string;
    ownerId?: string;
    isDeleted?: boolean;
    tooltipInfo?: Record<string, string>;
    onClick?: (id: string, evt: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void;
};

export function ItemCard(props: ItemCardProps): React.ReactNode {
    const showOwnerRow = props.ownerId !== undefined;

    const ownerInfo = useUserGraphInfo(props.ownerId);

    const allTooltipInfo = React.useMemo(() => {
        if (!ownerInfo) return props.tooltipInfo;

        return {
            Author: ownerInfo?.display_name,
            ...props.tooltipInfo,
        };
    }, [ownerInfo, props.tooltipInfo]);

    function handleClick(evt: React.MouseEvent<HTMLAnchorElement, MouseEvent>) {
        if (props.isDeleted) {
            evt.preventDefault();
            evt.stopPropagation();
            return;
        }
        props.onClick?.(props.id, evt);
    }

    return (
        <div
            className={resolveClassNames(
                "gap-xs px-selectable h-selectable-md text-accent-subtle text-body-md flex w-full min-w-0 items-center rounded",
                {
                    "cursor-not-allowed italic line-through opacity-50": props.isDeleted,
                    "hover:bg-accent-hover": !props.isDeleted,
                },
            )}
        >
            <Popover.Root>
                <Popover.Trigger size="small" variant="ghost" iconOnly>
                    <Info />
                </Popover.Trigger>
                <Popover.Popup side="left">
                    <Popover.Content>
                        <TooltipContent {...props} owner={ownerInfo} tooltipInfo={allTooltipInfo} />
                    </Popover.Content>
                </Popover.Popup>
            </Popover.Root>
            <a
                className="gap-xs py-selectable flex w-full min-w-0 items-center"
                href={props.href}
                onClick={handleClick}
            >
                <div className="min-w-0 flex-[1_1_0px] truncate">{props.title}</div>
                {showOwnerRow && <OwnerLine owner={ownerInfo} />}
                <span className="text-body-xs w-24 shrink-0 text-right whitespace-nowrap">
                    ~<TimeAgo datetimeMs={new Date(props.timestamp).getTime()} updateIntervalMs={5000} shorten />
                </span>
            </a>
        </div>
    );
}

function OwnerLine(props: { owner: GraphUser_api | null }): React.ReactNode {
    const name = props.owner?.principal_name?.split("@")?.[0].toLocaleLowerCase();
    const avatarFn = useUserAvatar(name ?? "", props.owner?.display_name);

    return (
        <div className="gap-xs text-body-sm flex w-16 shrink-0 items-center justify-start italic">
            <Avatar size={16} userData={props.owner !== null ? avatarFn : undefined} />
            <span className="min-w-0 flex-1 truncate">{name}</span>
        </div>
    );
}

function useUserGraphInfo(ownerId: string | undefined): GraphUser_api | null {
    const userInfoQuery = useQuery({
        ...getUserInfoOptions({ path: { user_id_or_email: ownerId ?? "" } }),
        enabled: Boolean(ownerId),
    });

    return userInfoQuery.data ?? null;
}

function TooltipContent(
    props: { owner: GraphUser_api | null; tooltipInfo?: Record<string, string> } & ItemCardProps,
): React.ReactNode {
    if (props.isDeleted) {
        return "This item has been deleted.";
    }
    return (
        <div className="text-body-md w-2xs whitespace-normal">
            <Heading as="h6" variant="strong" weight="bolder">
                {props.title}
            </Heading>
            <Separator orientation="horizontal" />
            {props.description && <p className="text-body-sm whitespace-pre-wrap">{props.description}</p>}
            {props.tooltipInfo && (
                <ul className="mt-sm text-body-sm truncate">
                    {Object.entries(props.tooltipInfo).map(([k, v]) => (
                        <li key={k} className="truncate">
                            {k}: <strong>{v}</strong>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
