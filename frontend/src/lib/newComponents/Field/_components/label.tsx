import type { FieldLabelProps as FieldLabelBaseProps } from "@base-ui/react";
import { Field as FieldBase } from "@base-ui/react";

import { useWrappedBaseUIProps, type WrappedBaseUIProps } from "@lib/newComponents/_shared/useWrappedBaseUIProps";
import { Typography } from "@lib/newComponents/Typography";

export type LabelProps = WrappedBaseUIProps<FieldLabelBaseProps> & {
    required?: boolean;
};

export function Label(props: LabelProps) {
    const baseProps = useWrappedBaseUIProps(props, "required", "aria-required");

    return (
        <FieldBase.Label
            {...baseProps}
            aria-required={props.required}
            render={<Typography as="label" family="body" size="md" tone="neutral" />}
        >
            {props.children}
            {props.required && <span className="text-neutral-subtle"> (Required)</span>}
        </FieldBase.Label>
    );
}
