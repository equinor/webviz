import { CheckboxGroup as CheckboxGroupBase, type CheckboxGroupProps as CheckboxGroupBaseProps } from "@base-ui/react";
import { CheckboxItem } from "./checkboxItem";

export type CheckboxOption = {
    label: string;
    value: string;
    disabled?: boolean;
};

export type SimpleCheckboxGroupProps = {
    options: CheckboxOption[];
    layout?: "vertical" | "horizontal";
} & Omit<CheckboxGroupBaseProps, "className" | "style" | "render">;

export const SimpleCheckboxGroup = function SimpleCheckboxGroup(props: SimpleCheckboxGroupProps) {
    const { options, layout = "vertical", ...groupProps } = props;
    return (
        <CheckboxGroupBase {...groupProps}>
            <div className={layout === "horizontal" ? "flex flex-row gap-4" : "flex flex-col gap-1"}>
                {options.map((option) => (
                    <CheckboxItem
                        key={option.value}
                        value={option.value}
                        label={option.label}
                        disabled={option.disabled ?? groupProps.disabled}
                    />
                ))}
            </div>
        </CheckboxGroupBase>
    );
};
