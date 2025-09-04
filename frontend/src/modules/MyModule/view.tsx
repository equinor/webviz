import React from "react";

import type { PlotData } from "plotly.js";

import type { ModuleViewProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ColorScaleType } from "@lib/utils/ColorScale";
import { Plot } from "@modules/_shared/components/Plot";

import type { Interfaces } from "./interfaces";

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const ref = React.useRef<HTMLDivElement>(null);

    return <div ref={ref} className="w-full h-full"></div>;
}
