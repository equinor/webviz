import React from "react";

import type { FieldLabelProps as FieldLabelBaseProps } from "@base-ui/react";
import { Field as FieldBase } from "@base-ui/react";

import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/components/_shared/utils/wrapperProps";
import { Typography } from "@lib/components/Typography";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type LabelProps = ComponentWrapperProps<FieldLabelBaseProps> & {
    /** Short supplementary text rendered after the label, e.g. "(optional)". */
    indicator?: string;
};

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(function Label(props, ref) {
    const baseProps = resolveWrapperProps(props, "indicator");

    return (
        <FieldBase.Label
            {...baseProps}
            ref={ref}
            className={resolveClassNames(baseProps.className, "gap-x-selectable flex items-center")}
            render={<Typography as="label" family="body" variant="strong" size="md" tone="neutral" />}
        >
            {props.children}
            {props.indicator && (
                <Typography as="span" family="body" variant="subtle" size="sm" tone="neutral">
                    {props.indicator}
                </Typography>
            )}
        </FieldBase.Label>
    );
});
