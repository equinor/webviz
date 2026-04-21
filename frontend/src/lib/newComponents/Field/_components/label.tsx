import { Field as FieldBase } from "@base-ui/react";

import { Typography } from "@lib/newComponents/Typography";

export type LabelProps = {
    children: React.ReactNode;
    required?: boolean;
};

export function Label(props: LabelProps) {
    return (
        <FieldBase.Label
            className="text-neutral"
            aria-required={props.required}
            render={<Typography as="label" family="body" size="md" />}
        >
            {props.children}
            {props.required && <span className="text-neutral-subtle"> (Required)</span>}
        </FieldBase.Label>
    );
}
