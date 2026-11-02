import type React from "react";

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
                    <ul className="pl-md list-disc">
                        {toDelete.map((item) => (
                            <li key={item.snapshotId}>{item.title}</li>
                        ))}
                    </ul>
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
