import type React from "react";

export type EmptyContentProps = {
    children?: React.ReactNode;
};

export function EmptyContent(props: EmptyContentProps): React.ReactNode {
    return (
        <div className="bg-surface! px-3xs py-3xs text-body-sm border-neutral-subtle flex h-16 items-center justify-center border">
            {props.children}
        </div>
    );
}
