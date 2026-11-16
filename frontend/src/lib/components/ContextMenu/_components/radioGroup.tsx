import React from "react";

import type { ContextMenuRadioGroupProps } from "@base-ui/react";
import { ContextMenu as ContextMenuBase } from "@base-ui/react";

export type RadioGroupProps = Omit<ContextMenuRadioGroupProps, "className" | "style">;

export const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(function RadioGroup(props, ref) {
    return <ContextMenuBase.RadioGroup {...props} ref={ref} className="" />;
});
