import type React from "react";

export type ViewportLabelProps = {
    name: string;
    color: string | null;
};

export function ViewportLabel(props: ViewportLabelProps): React.ReactNode {
    return (
        <div className="font-bolder gap-x-2xs flex items-center justify-center text-base">
            <div className="gap-x-2xs font-bolder px-2xs py-3xs bg-surface/50 flex items-center rounded-sm text-base backdrop-blur-sm">
                <div
                    className="border-neutral-subtle h-3 w-3 rounded-full border"
                    style={{ backgroundColor: props.color ?? undefined }}
                />
                <div>{props.name}</div>
            </div>
        </div>
    );
}
