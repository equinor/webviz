import { Checkbox as CheckboxBase, CheckboxRootProps } from "@base-ui/react";
import { CheckBox, CheckBoxOutlineBlank, IndeterminateCheckBox } from "@mui/icons-material";

export type CheckboxProps = Omit<CheckboxRootProps, "className" | "style" | "render" | "readOnly">;

export function Checkbox(props: CheckboxProps) {
    return (
        <CheckboxBase.Root
            {...props}
            className="group hover:bg-accent-hover active:bg-accent-active data-disabled:text-fill-disabled p-selectable-y text-body-2xl text-accent-subtle focus-visible:outline-accent-strong box-border flex aspect-square cursor-pointer appearance-none items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-dashed data-disabled:cursor-not-allowed data-disabled:bg-transparent data-readonly:cursor-default data-readonly:hover:bg-transparent"
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
