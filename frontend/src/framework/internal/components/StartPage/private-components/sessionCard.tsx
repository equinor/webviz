import React from "react";

import { Tooltip } from "@equinor/eds-core-react";
import { useQuery } from "@tanstack/react-query";

import type { GraphUser_api } from "@api";
import { getUserInfoOptions } from "@api";
import { useAuthProvider } from "@framework/internal/providers/AuthProvider";
import { timeAgo } from "@lib/utils/dates";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { UserAvatar } from "../../UserAvatar";

export type SessionCardProps = {
    id: string;
    title: string;
    timestamp: string;
    description: string | null;
    href: string;

    ownerId?: string;

    tooltipInfo?: Record<string, string>;

    onClick?: (id: string, evt: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void;
};

export function SessionCard(props: SessionCardProps): React.ReactNode {
    const showOwnerRow = props.ownerId;

    const paddingClass = showOwnerRow ? "py-1" : "py-3.5";
    const ownerInfo = useUserGraphInfo(props.ownerId);

    const allTooltipInfo = React.useMemo(() => {
        if (!ownerInfo) return props.tooltipInfo;

        return {
            "Created by": ownerInfo?.principal_name,
            ...props.tooltipInfo,
        };
    }, [ownerInfo, props.tooltipInfo]);

    return (
        <li>
            <Tooltip
                title={<TooltipContent {...props} owner={ownerInfo} tooltipInfo={allTooltipInfo} />}
                placement="right"
            >
                <a
                    className={resolveClassNames(
                        "flex gap-4 items-center px-4 rounded hover:bg-indigo-100",
                        paddingClass,
                    )}
                    href={props.href}
                    onClick={(evt) => props.onClick?.(props.id, evt)}
                >
                    <div className="overflow-hidden">
                        <span className="truncate text-lg">{props.title}</span>
                        {showOwnerRow && <OwnerLine owner={ownerInfo} />}
                    </div>
                    <span className="ml-auto text-base text-gray-500 whitespace-nowrap">
                        ~ {timeAgo(Date.now() - new Date(props.timestamp).getTime())}
                    </span>
                </a>
            </Tooltip>
        </li>
    );
}

function OwnerLine(props: { owner: GraphUser_api | null }): React.ReactNode {
    const { userInfo: activeUserInfo } = useAuthProvider();

    const name = props.owner?.principal_name?.split("@")?.[0].toLocaleLowerCase();
    const isSelf = activeUserInfo && props.owner?.id === activeUserInfo.user_id;

    return (
        <div className="-mt-1 flex gap-1 items-center text-base italic text-gray-500">
            <UserAvatar userEmail={props.owner?.id ?? ""} className="shrink-0 inline" />
            <span className="truncate">{name}</span>
            {isSelf && <span>(You)</span>}
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
    props: { owner: GraphUser_api | null; tooltipInfo?: Record<string, string> } & SessionCardProps,
): React.ReactNode {
    return (
        <div className="w-2xs whitespace-normal text-base">
            <h3 className="text-xl">{props.title}</h3>

            <hr className="h-px mb-2 bg-white/25" />
            {props.description && <p>{props.description}</p>}

            {props.tooltipInfo && (
                <ul className="mt-6 text-sm truncate italic">
                    {Object.entries(props.tooltipInfo).map(([k, v]) => (
                        <li key={k} className="truncate">
                            <b>{k}:</b> {v}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
