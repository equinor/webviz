import React from "react";

import { Button } from "@lib/components/Button";

const NUM_COLLAPSED_TITLES = 5;

export type SnapshotDeletionItem = {
    snapshotId: string;
    title: string;
};

export function makeSnapshotDeletionMessage(
    toDelete: SnapshotDeletionItem[],
    toRemove: SnapshotDeletionItem[],
): React.ReactNode {
    return (
        <div className="gap-y-sm flex flex-col">
            {toDelete.length > 0 && (
                <div>
                    <p>
                        <strong>
                            {toDelete.length} {toDelete.length === 1 ? "snapshot" : "snapshots"} you own
                        </strong>{" "}
                        will be permanently deleted for all users. This cannot be undone:
                    </p>
                    <SnapshotTitleList items={toDelete} />
                </div>
            )}
            {toRemove.length > 0 && (
                <p>
                    <strong>
                        {toRemove.length} {toRemove.length === 1 ? "snapshot" : "snapshots"}
                    </strong>{" "}
                    will be removed from your list. Other users are not affected.
                </p>
            )}
            {toDelete.length > 0 && (
                <p>
                    Choose <em>Only remove from my list</em> to keep your snapshots available to others.
                </p>
            )}
        </div>
    );
}

function SnapshotTitleList(props: { items: SnapshotDeletionItem[] }): React.ReactNode {
    const [expanded, setExpanded] = React.useState(false);

    const canExpand = props.items.length > NUM_COLLAPSED_TITLES;
    const visibleItems = expanded ? props.items : props.items.slice(0, NUM_COLLAPSED_TITLES);

    return (
        <div className="gap-y-2xs flex flex-col items-start">
            <ul
                className={
                    expanded
                        ? "pl-xl py-2xs border-neutral-subtle max-h-48 w-full list-disc overflow-y-auto rounded border"
                        : "pl-xl list-disc"
                }
            >
                {visibleItems.map((item) => (
                    <li key={item.snapshotId}>{item.title}</li>
                ))}
            </ul>
            {canExpand && (
                <Button variant="ghost" tone="accent" size="small" onClick={() => setExpanded((prev) => !prev)}>
                    {expanded ? "Show less" : `Show all ${props.items.length}`}
                </Button>
            )}
        </div>
    );
}
