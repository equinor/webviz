import React from "react";

import type { GraphUser_api } from "@api";
import { getUserInfoOptions } from "@api";
import { Tooltip } from "@lib/components/Tooltip";
import { timeAgo } from "@lib/utils/dates";
import { useQuery } from "@tanstack/react-query";

import { UserAvatar } from "../../UserAvatar";

export type ItemCardProps = {
    id: string;
    title: string;
    timestamp: string;
    description: string | null;
    href: string;

    ownerId?: string;

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

    return (
        <li className="max-w-sm">
            <Tooltip
                title={<TooltipContent {...props} owner={ownerInfo} tooltipInfo={allTooltipInfo} />}
                placement="left"
                enterDelay="medium"
            >
                <a
                    className="flex gap-4 items-center px-2 py-1 rounded hover:bg-indigo-100 text-indigo-600"
                    href={props.href}
                    onClick={(evt) => props.onClick?.(props.id, evt)}
                >
                    <div className="overflow-hidden truncate">
                        <span>{props.title}</span>
                    </div>
                    {showOwnerRow && <OwnerLine owner={ownerInfo} />}
                    <span className="ml-auto text-gray-500 whitespace-nowrap text-xs">
                        ~ {timeAgo(Date.now() - new Date(props.timestamp).getTime())}
                    </span>
                </a>
            </Tooltip>
        </li>
    );
}

function OwnerLine(props: { owner: GraphUser_api | null }): React.ReactNode {
    const name = props.owner?.principal_name?.split("@")?.[0].toLocaleLowerCase();

    return (
        <div className="flex gap-1 items-center text-sm italic text-gray-500">
            <UserAvatar userEmail={props.owner?.id ?? ""} className="shrink-0 inline" />
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
        </div>
    );
}
