import React from "react";

import type { ContextMenuGroupProps } from "@base-ui/react";
import { ContextMenu as ContextMenuBase } from "@base-ui/react";

export type GroupProps = Omit<ContextMenuGroupProps, "className" | "style">;

export const Group = React.forwardRef<HTMLDivElement, GroupProps>(function Group(props, ref) {
    return <ContextMenuBase.Group {...props} ref={ref} className="" />;
});
