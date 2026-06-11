import type { ContextMenuRadioGroupProps } from "@base-ui/react";
import { ContextMenu as ContextMenuBase } from "@base-ui/react";

export type RadioGroupProps = Omit<ContextMenuRadioGroupProps, "className" | "style">;

export function RadioGroup(props: RadioGroupProps) {
    return <ContextMenuBase.RadioGroup {...props} className="" />;
}
