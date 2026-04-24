import { RadioGroup as RadioGroupBase, type RadioGroupProps as RadioGroupBaseProps } from "@base-ui/react";

export type RadioGroupProps = Omit<RadioGroupBaseProps, "className" | "style" | "render">;

export function RadioGroup(props: RadioGroupProps) {
    return <RadioGroupBase {...props} />;
}
