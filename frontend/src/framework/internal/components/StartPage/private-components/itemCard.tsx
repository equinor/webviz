import React from "react";

import { Info } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";

import type { GraphUser_api } from "@api";
import { getUserInfoOptions } from "@api";
import { useUserAvatar } from "@framework/internal/utils/useUserAvatar";
import { Avatar } from "@lib/newComponents/Avatar";
import { Button } from "@lib/newComponents/Button";
import { Popover } from "@lib/newComponents/Popover";
import { TimeAgo } from "@lib/newComponents/TimeAgo/timeAgo";

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
        <Button.Group layoutClassName="w-full" split>
            <Button.AsLink
                variant="ghost"
                size="small"
                data-is-deleted={props.isDeleted ? "" : undefined}
                layoutClassName="flex-1 min-w-0 data-is-deleted:line-through"
                compact
                disabled={props.isDeleted}
                href={props.href}
                onClick={handleClick}
            >
                <div className="min-w-0 grow truncate">{props.title}</div>
                {showOwnerRow && <OwnerLine owner={ownerInfo} />}
                <span className="text-body-xs text-neutral-subtle w-16 shrink-0 text-right whitespace-nowrap">
                    ~<TimeAgo datetimeMs={new Date(props.timestamp).getTime()} updateIntervalMs={5000} shorten />
                </span>
            </Button.AsLink>

            <Popover.Root>
                <Popover.Trigger size="small" variant="ghost" iconOnly>
                    <Info />
                </Popover.Trigger>
                <Popover.Popup side="bottom">
                    <Popover.Title hideCloseButton>{props.title}</Popover.Title>
                    <Popover.Content as="div" layoutClassName="min-w-2xs">
                        <PopoverContent {...props} owner={ownerInfo} tooltipInfo={allTooltipInfo} />
                    </Popover.Content>
                </Popover.Popup>
            </Popover.Root>
        </Button.Group>
    );
}

function OwnerLine(props: { owner: GraphUser_api | null }): React.ReactNode {
    const name = props.owner?.principal_name?.split("@")?.[0].toLocaleLowerCase();
    const avatarFn = useUserAvatar(props.owner?.id ?? "", props.owner?.display_name);

    return (
        <div className="mx-sm gap-xs text-body-sm flex w-16 shrink-0 items-center justify-start italic no-underline!">
            <Avatar size={16} userData={props.owner !== null ? avatarFn : undefined} />
            <span className="min-w-0 flex-1 truncate no-underline!">{name}</span>
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

function PopoverContent(
    props: { owner: GraphUser_api | null; tooltipInfo?: Record<string, string> } & ItemCardProps,
): React.ReactNode {
    return (
        <>
            {props.isDeleted && (
                <p className="text-danger-subtle italic">This snapshot has been deleted by the owner.</p>
            )}
            {props.description && (
                <p className="text-body-sm wrap-break-word hyphens-auto whitespace-pre-wrap">{props.description}</p>
            )}
            {props.tooltipInfo && (
                <ul className="not-first:mt-sm text-body-sm truncate">
                    {Object.entries(props.tooltipInfo).map(([k, v]) => (
                        <li key={k} className="truncate">
                            {k}: <strong>{v}</strong>
                        </li>
                    ))}
                </ul>
            )}
        </>
    );
}
