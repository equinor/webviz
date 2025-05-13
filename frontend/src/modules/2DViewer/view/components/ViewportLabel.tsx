import type React from "react";

import type { ViewportTypeExtended } from "./SubsurfaceViewerWrapper";

export type ViewportLabelProps = {
    viewport: ViewportTypeExtended;
};

export function ViewportLabel(props: ViewportLabelProps): React.ReactNode {
    return (
        <div className="font-bold text-lg flex gap-2 justify-center items-center">
            <div className="flex gap-2 items-center bg-white/50 p-2 backdrop-blur-sm rounded-sm">
                <div
                    className="rounded-full h-3 w-3 border border-white"
                    style={{ backgroundColor: props.viewport.color ?? undefined }}
                />
                <div className="">{props.viewport.name}</div>
            </div>
        </div>
    );
}
