import { Paragraph } from "@lib/components/Typography/compositions";
import type React from "react";

export function makeSessionDeletionMessage(count: number): React.ReactNode {
    const isPlural = count > 1;

    return (
        <div className="gap-y-lg flex flex-col">
            <Paragraph size="md">
                {isPlural ? `${count} sessions` : "This session"} will be deleted. This action cannot be reversed.
            </Paragraph>
            <Paragraph size="sm" italic tone="neutral">
                Note that any snapshots made from {isPlural ? "these sessions" : "this session"} will still be
                available.
            </Paragraph>
        </div>
    );
}
