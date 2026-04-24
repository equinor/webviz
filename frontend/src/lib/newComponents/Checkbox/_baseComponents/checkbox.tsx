import { Checkbox as CheckboxBase, CheckboxRootProps } from "@base-ui/react";
import { CheckBox, CheckBoxOutlineBlank, IndeterminateCheckBox } from "@mui/icons-material";

export type CheckboxProps = Omit<CheckboxRootProps, "className" | "style" | "render" | "readOnly">;

export function Checkbox(props: CheckboxProps) {
    return (
        <CheckboxBase.Root
            {...props}
            className="selectable group text-body-2xl text-accent-subtle box-border flex aspect-square appearance-none items-center justify-center rounded-full"
        >
            <CheckboxBase.Indicator className="flex items-center justify-center data-indeterminate:hidden data-unchecked:hidden">
                <CheckBox fontSize="inherit" />
            </CheckboxBase.Indicator>
            <CheckboxBase.Indicator className="flex items-center justify-center data-checked:hidden data-unchecked:hidden">
                <IndeterminateCheckBox fontSize="inherit" />
            </CheckboxBase.Indicator>
            <span className="flex items-center justify-center group-data-checked:hidden group-data-indeterminate:hidden">
                <CheckBoxOutlineBlank fontSize="inherit" />
            </span>
        </CheckboxBase.Root>
    );
}
