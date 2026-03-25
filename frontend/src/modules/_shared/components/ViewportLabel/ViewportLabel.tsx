import type React from "react";

export type ViewportLabelProps = {
    name: string;
    color: string | null;
};

export function ViewportLabel(props: ViewportLabelProps): React.ReactNode {
    return (
        <div className="font-bold text-base flex gap-2 justify-center items-center">
            <div className="flex gap-2 items-center bg-white/50 px-2 py-1 backdrop-blur-sm rounded-sm">
                <div
                    className="rounded-full h-3 w-3 border border-white"
                    style={{ backgroundColor: props.color ?? undefined }}
                />
                <div>{props.name}</div>
            </div>
        </div>
    );
}
