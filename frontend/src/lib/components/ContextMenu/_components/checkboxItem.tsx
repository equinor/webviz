import React from "react";

import type { ContextMenuCheckboxItemProps } from "@base-ui/react";

import { SharedCheckboxItem } from "@lib/components/_shared/components/menus/checkboxItem";

export type CheckboxItemProps = Omit<ContextMenuCheckboxItemProps, "className" | "style">;

export const CheckboxItem = React.forwardRef<HTMLDivElement, CheckboxItemProps>(function CheckboxItem(props, ref) {
    return <SharedCheckboxItem {...props} ref={ref} />;
});
