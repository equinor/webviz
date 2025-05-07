import type React from "react";

export type ValueResultProps = {
    children: React.ReactNode;
};

export function ValueResult(props: ValueResultProps): React.ReactNode {
    return (
        <p className="py-1">
            <output className="text-sm border-2 border-gray-400 p-1.5 rounded bg-gray-100">{props.children}</output>
        </p>
    );
}
