import type { ContextMenuRadioItemProps } from "@base-ui/react";

import { SharedRadioItem } from "@lib/newComponents/_shared/components/menus/radioItem";

export type RadioItemProps = Omit<ContextMenuRadioItemProps, "className" | "style">;

export function RadioItem(props: RadioItemProps) {
    return <SharedRadioItem {...props} />;
}
