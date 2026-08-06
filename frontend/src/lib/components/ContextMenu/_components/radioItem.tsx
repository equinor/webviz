import React from "react";

import type { ContextMenuRadioItemProps } from "@base-ui/react";

import { SharedRadioItem } from "@lib/components/_shared/components/menus/radioItem";

export type RadioItemProps = Omit<ContextMenuRadioItemProps, "className" | "style">;

export const RadioItem = React.forwardRef<HTMLDivElement, RadioItemProps>(function RadioItem(props, ref) {
    return <SharedRadioItem {...props} ref={ref} />;
});
