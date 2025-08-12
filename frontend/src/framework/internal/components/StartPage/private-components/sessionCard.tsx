import type React from "react";

import { useAuthProvider } from "@framework/internal/providers/AuthProvider";
import { timeAgo } from "@lib/utils/dates";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { UserAvatar } from "../../UserAvatar";

export type BaseListCardProps = {
    id: string;
    title: string;
    timestamp: string;
    description: string | null;
    href: string;
    ownerId?: string;
    onClick?: (id: string, evt: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void;
};

export function SessionCard(props: BaseListCardProps): React.ReactNode {
    const showOwnerRow = props.ownerId;

    const titleSizeClass = showOwnerRow ? "text-lg" : "text-xl";
    const paddingClass = showOwnerRow ? "py-0.5" : "py-3";

    return (
        <li>
            <a
                className={resolveClassNames("flex gap-4 items-center px-4 rounded hover:bg-indigo-100", paddingClass)}
                href={props.href}
                onClick={(evt) => props.onClick?.(props.id, evt)}
            >
                <div className="overflow-hidden">
                    <span className={resolveClassNames("truncate", titleSizeClass)}>{props.title}</span>
                    {props.ownerId && <OwnerLine ownerId={props.ownerId} />}
                </div>
                <span className="ml-auto text-base text-gray-500 whitespace-nowrap">
                    ~ {timeAgo(Date.now() - new Date(props.timestamp).getTime())}
                </span>
            </a>
        </li>
    );
}

function OwnerLine(props: { ownerId: string }): React.ReactNode {
    const { userInfo } = useAuthProvider();

    const isSelf = userInfo && props.ownerId === userInfo.user_id;

    return (
        <div className="flex gap-1 text-sm italic text-gray-500">
            <UserAvatar userEmail="ANHUN@equinor.com" className="shrink-0" />
            {/* TODO: Get username */}
            <span className="truncate">{userInfo?.user_id}</span>
            {isSelf && <span>(You)</span>}
        </div>
    );
}
