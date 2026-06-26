import React from "react";

import { Radio as RadioBase, type RadioRootProps as RadioRootBaseProps } from "@base-ui/react";
import { RadioButtonChecked, RadioButtonUnchecked } from "@mui/icons-material";

import { useComponentSize } from "@lib/newComponents/_shared/contexts/componentSizeContext";
import { getIconSizeClassNameForSelectableSize, type SelectableSize } from "@lib/newComponents/_shared/utils/size";
import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type RadioProps = ComponentWrapperProps<RadioRootBaseProps> & {
    /** Size of the radio button. @default "default" */
    size?: SelectableSize;
};

export const Radio = React.forwardRef<HTMLSpanElement, RadioProps>(function Radio(props, ref) {
    const baseProps = resolveWrapperProps(props, "size");
    const size = useComponentSize(props);

    return (
        <RadioBase.Root
            {...baseProps}
            ref={ref}
            className={resolveClassNames(
                baseProps.className,
                "group selectable text-accent-subtle box-border flex aspect-square w-fit appearance-none items-center justify-center rounded-full",
                getIconSizeClassNameForSelectableSize(size),
            )}
        >
            <RadioBase.Indicator className="flex items-center justify-center data-unchecked:hidden">
                <RadioButtonChecked fontSize="inherit" />
            </RadioBase.Indicator>
            <span className="flex items-center justify-center group-data-checked:hidden">
                <RadioButtonUnchecked fontSize="inherit" />
            </span>
        </RadioBase.Root>
    );
});
