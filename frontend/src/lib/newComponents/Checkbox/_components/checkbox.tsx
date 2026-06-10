import React from "react";

import type { CheckboxRootProps } from "@base-ui/react";
import { Checkbox as CheckboxBase } from "@base-ui/react";
import { CheckBox, CheckBoxOutlineBlank, IndeterminateCheckBox } from "@mui/icons-material";

import { useComponentSize } from "@lib/newComponents/_shared/contexts/componentSizeContext";
import { getIconSizeClassNameForSelectableSize, type SelectableSize } from "@lib/newComponents/_shared/utils/size";
import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type CheckboxProps = ComponentWrapperProps<Omit<CheckboxRootProps, "ref">> & {
    size?: SelectableSize;
};

export const Checkbox = React.forwardRef<HTMLSpanElement, CheckboxProps>(function Checkbox(props, ref) {
    const baseProps = resolveWrapperProps(props, "size");
    const size = useComponentSize(props);

    return (
        <CheckboxBase.Root
            {...baseProps}
            ref={ref}
            className={resolveClassNames(
                props.layoutClassName,
                "selectable group/checkbox text-accent-subtle box-border flex aspect-square w-fit appearance-none items-center justify-center rounded-full",
                getIconSizeClassNameForSelectableSize(size),
            )}
        >
            <CheckboxBase.Indicator className="flex items-center justify-center not-group-data-checked/checkbox:hidden">
                <CheckBox fontSize="inherit" />
            </CheckboxBase.Indicator>
            <CheckboxBase.Indicator className="flex items-center justify-center not-group-data-indeterminate/checkbox:hidden">
                <IndeterminateCheckBox fontSize="inherit" />
            </CheckboxBase.Indicator>
            <span className="flex items-center justify-center not-group-data-unchecked/checkbox:hidden">
                <CheckBoxOutlineBlank fontSize="inherit" />
            </span>
        </CheckboxBase.Root>
    );
});
