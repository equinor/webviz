import React from "react";

import type { ContextMenuTriggerProps } from "@base-ui/react";
import { ContextMenu as ContextMenuBase } from "@base-ui/react";

export type TriggerProps = Omit<ContextMenuTriggerProps, "className" | "style"> & {
    children?: React.ReactNode;
};

export const Trigger = React.forwardRef<HTMLDivElement, TriggerProps>(function Trigger(props, ref) {
    return <ContextMenuBase.Trigger {...props} ref={ref} />;
});
