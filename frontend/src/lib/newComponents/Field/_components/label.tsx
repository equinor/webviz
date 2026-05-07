import type { FieldLabelProps as FieldLabelBaseProps } from "@base-ui/react";
import { Field as FieldBase } from "@base-ui/react";

import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/wrapperProps";
import { Typography } from "@lib/newComponents/Typography";

export type LabelProps = ComponentWrapperProps<FieldLabelBaseProps> & {
    required?: boolean;
};

export function Label(props: LabelProps) {
    const baseProps = resolveWrapperProps(props, "required", "aria-required");

    return (
        <FieldBase.Label
            {...baseProps}
            aria-required={props.required}
            className="gap-horizontal-3xs flex items-center"
            render={<Typography as="label" family="body" size="md" tone="neutral" />}
        >
            {props.children}
            {props.required && <span className="text-neutral-subtle"> (Required)</span>}
        </FieldBase.Label>
    );
}
