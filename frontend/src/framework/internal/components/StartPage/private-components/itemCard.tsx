import React from "react";

import { useQuery } from "@tanstack/react-query";

import type { GraphUser_api } from "@api";
import { getUserInfoOptions } from "@api";
import { Tooltip } from "@lib/components/Tooltip";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { UserAvatar } from "../../UserAvatar";
import { TimeAgo } from "@lib/components/TimeAgo/timeAgo";

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
                className={resolveClassNames("flex gap-4 items-center px-2 py-1 rounded text-indigo-600 font-medium", {
                    "opacity-50 italic line-through cursor-not-allowed": props.isDeleted,
                    "hover:bg-indigo-100": !props.isDeleted,
                })}
                href={props.href}
                onClick={handleClick}
            >
                <div className="w-24 overflow-hidden truncate grow">
                    <span>{props.title}</span>
                </div>
                {showOwnerRow && <OwnerLine owner={ownerInfo} />}
                <span className="w-24 ml-auto text-gray-500 whitespace-nowrap text-xs">
                    ~ <TimeAgo datetimeMs={new Date(props.timestamp).getTime()} updateIntervalMs={5000} />
                </span>
            </a>
        </Tooltip>
    );
}

function OwnerLine(props: { owner: GraphUser_api | null }): React.ReactNode {
    const name = props.owner?.principal_name?.split("@")?.[0].toLocaleLowerCase();

    return (
        <div className="flex gap-1 items-center text-sm italic text-gray-500">
            <UserAvatar
                userIdOrEmail={props.owner?.id ?? ""}
                className="shrink-0 inline"
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

// TODO: Show preview image here?
function TooltipContent(
    props: { owner: GraphUser_api | null; tooltipInfo?: Record<string, string> } & ItemCardProps,
): React.ReactNode {
    if (props.isDeleted) {
        return "This item has been deleted.";
    }
    return (
        <div className="w-2xs whitespace-normal text-base">
            <h3 className="text-lg">{props.title}</h3>
            <hr className="h-px mb-2 bg-white/25" />
            {props.description && <p className="text-sm">{props.description}</p>}
            {props.tooltipInfo && (
                <ul className="mt-6 text-sm truncate">
                    {Object.entries(props.tooltipInfo).map(([k, v]) => (
                        <li key={k} className="truncate">
                            {k}: <strong>{v}</strong>
                        </li>
                    ))}
                </ul>
            )}
            <span className="italic mt-4 block text-gray-400 text-sm">Click to open</span>
        </div>
    );
}
