import React from "react";

import { useQuery } from "@tanstack/react-query";

import type { GraphUser_api } from "@api";
import { getUserInfoOptions } from "@api";
import { TimeAgo } from "@lib/components/TimeAgo/timeAgo";
import { Tooltip } from "@lib/components/Tooltip";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { UserAvatar } from "../../UserAvatar";

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
    const showOwnerRow = props.ownerId;

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
        <Tooltip
            title={<TooltipContent {...props} owner={ownerInfo} tooltipInfo={allTooltipInfo} />}
            placement="left"
            enterDelay="medium"
        >
            <a
                className={resolveClassNames(
                    "gap-y-space-xs px-selectable-x py-selectable-y text-text-accent-subtle text-body-md flex items-center rounded",
                    {
                        "cursor-not-allowed italic line-through opacity-50": props.isDeleted,
                        "hover:bg-fill-accent-hover": !props.isDeleted,
                    },
                )}
                href={props.href}
                onClick={handleClick}
            >
                <div className="w-60 grow truncate overflow-hidden">
                    <span>{props.title}</span>
                </div>
                {showOwnerRow && <OwnerLine owner={ownerInfo} />}
                <span className="ml-auto w-20 text-xs whitespace-nowrap text-gray-500">
                    ~ <TimeAgo datetimeMs={new Date(props.timestamp).getTime()} updateIntervalMs={5000} shorten />
                </span>
            </a>
        </Tooltip>
    );
}

function OwnerLine(props: { owner: GraphUser_api | null }): React.ReactNode {
    const name = props.owner?.principal_name?.split("@")?.[0].toLocaleLowerCase();

    return (
        <div className="flex items-center gap-1 text-sm text-gray-500 italic">
            <UserAvatar
                userIdOrEmail={props.owner?.id ?? ""}
                className="inline shrink-0"
                userDisplayName={props.owner?.display_name}
            />
            <span className="truncate">{name}</span>
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
        <div className="w-2xs text-base whitespace-normal">
            <h3 className="text-lg">{props.title}</h3>
            <hr className="mb-2 h-px bg-white/25" />
            {props.description && <p className="text-sm whitespace-pre-wrap">{props.description}</p>}
            {props.tooltipInfo && (
                <ul className="mt-6 truncate text-sm">
                    {Object.entries(props.tooltipInfo).map(([k, v]) => (
                        <li key={k} className="truncate">
                            {k}: <strong>{v}</strong>
                        </li>
                    ))}
                </ul>
            )}
            <span className="mt-4 block text-sm text-gray-400 italic">Click to open</span>
        </div>
    );
}
