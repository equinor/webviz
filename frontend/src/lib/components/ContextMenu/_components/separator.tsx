import React from "react";

import { ContextMenu as ContextMenuBase } from "@base-ui/react";

export const Separator = React.forwardRef<HTMLDivElement>(function Separator(_, ref) {
    return <ContextMenuBase.Separator ref={ref} className="menu__separator" />;
});
