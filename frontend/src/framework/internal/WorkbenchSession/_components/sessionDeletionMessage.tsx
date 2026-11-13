import type React from "react";

import { Paragraph } from "@lib/components/Typography/compositions";

import { DeletionTitleList } from "./deletionTitleList";

export type SessionDeletionItem = {
    sessionId: string;
    title: string;
};

export function makeSessionDeletionMessage(items: SessionDeletionItem[]): React.ReactNode {
    const isPlural = items.length > 1;

    return (
        <div className="gap-y-lg flex flex-col">
            <div className="gap-y-sm flex flex-col">
                <Paragraph size="md">
                    <strong>
                        {items.length} {isPlural ? "sessions" : "session"}
                    </strong>{" "}
                    will be permanently deleted. This cannot be undone.
                </Paragraph>
                <DeletionTitleList items={items.map((s) => ({ id: s.sessionId, title: s.title }))} />
            </div>
            <Paragraph size="sm" italic tone="neutral">
                Snapshots made from {isPlural ? "these sessions" : "this session"} will still be available.
            </Paragraph>
        </div>
    );
}
