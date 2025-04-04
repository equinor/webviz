import type React from "react";

export type EmptyContentProps = {
    children?: React.ReactNode;
};

export function EmptyContent(props: EmptyContentProps): React.ReactNode {
    return <div className="flex bg-white! h-16 border p-2 text-sm items-center justify-center">{props.children}</div>;
}
