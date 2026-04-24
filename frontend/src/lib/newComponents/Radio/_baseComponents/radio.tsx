import { Radio as RadioBase, type RadioRootProps } from "@base-ui/react";
import { RadioButtonChecked, RadioButtonUnchecked, RadioButtonUncheckedOutlined } from "@mui/icons-material";

export type RadioProps = Omit<RadioRootProps, "className" | "style" | "render">;

export function Radio(props: RadioProps) {
    return (
        <RadioBase.Root
            {...props}
            className="group selectable text-body-2xl text-accent-subtle data-disabled:text-disabled box-border flex aspect-square appearance-none items-center justify-center rounded-full"
        >
            <RadioBase.Indicator className="flex items-center justify-center data-unchecked:hidden">
                <RadioButtonChecked fontSize="inherit" />
            </RadioBase.Indicator>
            <span className="flex items-center justify-center group-data-checked:hidden">
                <RadioButtonUnchecked fontSize="inherit" />
            </span>
        </RadioBase.Root>
    );
}
