import type React from "react";

import { Paragraph } from "@lib/components/Typography/compositions";

import { DeletionTitleList } from "./deletionTitleList";

export type SnapshotDeletionItem = {
    snapshotId: string;
    title: string;
};

export function makeSnapshotDeletionMessage(
    toDelete: SnapshotDeletionItem[],
    toRemove: SnapshotDeletionItem[],
): React.ReactNode {
    return (
        <div className="gap-y-lg flex flex-col">
            {toDelete.length > 0 && (
                <div className="gap-y-sm flex flex-col">
                    <Paragraph size="md">
                        <strong>
                            {toDelete.length} {toDelete.length === 1 ? "snapshot" : "snapshots"} you own
                        </strong>{" "}
                        will be permanently deleted for all users. This cannot be undone.
                    </Paragraph>
                    <DeletionTitleList items={toDelete.map((s) => ({ id: s.snapshotId, title: s.title }))} />
                </div>
            )}
            {toRemove.length > 0 && (
                <Paragraph size="md">
                    <strong>
                        {toRemove.length} {toRemove.length === 1 ? "snapshot" : "snapshots"}
                    </strong>{" "}
                    will be removed from your list. Other users are not affected.
                </Paragraph>
            )}
            {toDelete.length > 0 && (
                <Paragraph size="sm" italic tone="neutral">
                    Choose <em>Only remove from my list</em> to keep your snapshots available to others.
                </Paragraph>
            )}
        </div>
    );
}
