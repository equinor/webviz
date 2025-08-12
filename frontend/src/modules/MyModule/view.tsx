import React from "react";

import type { ModuleViewProps } from "@framework/Module";

import type { Interfaces } from "./interfaces";

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const ref = React.useRef<HTMLDivElement>(null);

    return <div ref={ref} className="w-full h-full"></div>;
}
