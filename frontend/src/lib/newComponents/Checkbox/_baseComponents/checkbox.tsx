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
            data-space-proportions="squished"
            data-selectable-space="md"
            className={resolveClassNames(
                props.layoutClassName,
                "selectable group/checkbox text-accent-subtle box-border flex aspect-square appearance-none items-center justify-center rounded-full",
            )}
        >
            <CheckboxBase.Indicator className="flex items-center justify-center not-group-data-checked/checkbox:hidden">
                <CheckBox className="size-icon-lg" />
            </CheckboxBase.Indicator>
            <CheckboxBase.Indicator className="flex items-center justify-center not-group-data-indeterminate/checkbox:hidden">
                <IndeterminateCheckBox className="size-icon-lg" />
            </CheckboxBase.Indicator>
            <span className="flex items-center justify-center not-group-data-unchecked/checkbox:hidden">
                <CheckBoxOutlineBlank className="size-icon-lg" />
            </span>
        </CheckboxBase.Root>
    );
});
