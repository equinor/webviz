import { RadioGroup as RadioGroupBase, type RadioGroupProps as RadioGroupBaseProps } from "@base-ui/react";
import { RadioItem } from "./radioItem";

export type RadioOption = {
    label: string;
    value: string;
    disabled?: boolean;
};

export type SimpleRadioGroupProps = {
    options: RadioOption[];
    layout?: "vertical" | "horizontal";
} & Omit<RadioGroupBaseProps, "className" | "style" | "render">;

export const SimpleRadioGroup = function SimpleRadioGroup(props: SimpleRadioGroupProps) {
    const { options, layout = "vertical", ...groupProps } = props;
    return (
        <RadioGroupBase {...groupProps}>
            <div className={layout === "horizontal" ? "flex flex-row gap-4" : "flex flex-col gap-1"}>
                {options.map((option) => (
                    <RadioItem
                        key={option.value}
                        value={option.value}
                        label={option.label}
                        disabled={option.disabled ?? groupProps.disabled}
                    />
                ))}
            </div>
        </RadioGroupBase>
    );
};
