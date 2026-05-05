import React from "react";

import type { CheckboxRootProps } from "@base-ui/react";
import { Checkbox as CheckboxBase } from "@base-ui/react";
import { CheckBox, CheckBoxOutlineBlank, IndeterminateCheckBox } from "@mui/icons-material";

import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type CheckboxProps = ComponentWrapperProps<Omit<CheckboxRootProps, "ref">>;

export const Checkbox = React.forwardRef<HTMLSpanElement, CheckboxProps>(function Checkbox(props, ref) {
    const baseProps = resolveWrapperProps(props);

    return (
        <CheckboxBase.Root
            {...baseProps}
            ref={ref}
            className={resolveClassNames(
                props.layoutClassName,
                "selectable group text-body-3xl text-accent-subtle box-border flex aspect-square appearance-none items-center justify-center rounded-full",
            )}
        >
            <CheckboxBase.Indicator className="flex items-center justify-center not-data-checked:hidden">
                <CheckBox fontSize="inherit" />
            </CheckboxBase.Indicator>
            <CheckboxBase.Indicator className="flex items-center justify-center not-data-indeterminate:hidden">
                <IndeterminateCheckBox fontSize="inherit" />
            </CheckboxBase.Indicator>
            <span className="flex items-center justify-center not-group-data-unchecked:hidden">
                <CheckBoxOutlineBlank fontSize="inherit" />
            </span>
        </CheckboxBase.Root>
    );
});
