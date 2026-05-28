import React from "react";

import { Radio as RadioBase, type RadioRootProps as RadioRootBaseProps } from "@base-ui/react";
import { RadioButtonChecked, RadioButtonUnchecked } from "@mui/icons-material";

import { getIconSizeClassNameForSelectableSize, type SelectableSize } from "@lib/newComponents/_shared/size";
import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type RadioProps = ComponentWrapperProps<Omit<RadioRootBaseProps, "ref">> & {
    size?: SelectableSize;
};

export const Radio = React.forwardRef<HTMLSpanElement, RadioProps>(function Radio(props, ref) {
    const { size = "default", ...restProps } = props;
    const baseProps = resolveWrapperProps(restProps);

    return (
        <RadioBase.Root
            {...baseProps}
            ref={ref}
            value={props.value}
            className={resolveClassNames(
                props.layoutClassName,
                "group selectable text-accent-subtle box-border flex aspect-square appearance-none items-center justify-center rounded-full",
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
