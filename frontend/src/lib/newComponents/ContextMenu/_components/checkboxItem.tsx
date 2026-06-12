import type { ContextMenuCheckboxItemProps } from "@base-ui/react";

import { SharedCheckboxItem } from "@lib/newComponents/_shared/components/menus/checkboxItem";

export type CheckboxItemProps = Omit<ContextMenuCheckboxItemProps, "className" | "style">;

export function CheckboxItem(props: CheckboxItemProps) {
    return <SharedCheckboxItem {...props} />;
}
