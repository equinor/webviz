import type { FieldLabelProps as FieldLabelBaseProps } from "@base-ui/react";
import { Field as FieldBase } from "@base-ui/react";

import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import { Typography } from "@lib/newComponents/Typography";

export type LabelProps = ComponentWrapperProps<FieldLabelBaseProps> & {
    indicator?: string;
};

export function Label(props: LabelProps) {
    const baseProps = resolveWrapperProps(props, "indicator");

    return (
        <FieldBase.Label
            {...baseProps}
            className="gap-x-selectable flex items-center"
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
}
