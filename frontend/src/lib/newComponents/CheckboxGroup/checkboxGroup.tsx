import { CheckboxGroup as CheckboxGroupBase, CheckboxGroupProps as CheckboxGroupBaseProps } from "@base-ui/react";

export type CheckboxGroupProps = Omit<CheckboxGroupBaseProps, "className" | "style">;

export function CheckboxGroup(props: CheckboxGroupProps) {
    return <CheckboxGroupBase {...props} />;
}
