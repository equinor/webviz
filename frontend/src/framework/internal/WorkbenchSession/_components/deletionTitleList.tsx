import React from "react";

import { Button } from "@lib/components/Button";

const NUM_COLLAPSED_TITLES = 5;

export type DeletionTitleListItem = {
    id: string;
    title: string;
};

export type DeletionTitleListProps = {
    items: DeletionTitleListItem[];
};

export function DeletionTitleList(props: DeletionTitleListProps): React.ReactNode {
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
                    <li key={item.id}>{item.title}</li>
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
