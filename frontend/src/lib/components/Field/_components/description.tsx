import React from "react";

import { Field as FieldBase } from "@base-ui/react";
import type { FieldDescriptionProps as FieldDescriptionBaseProps } from "@base-ui/react";

import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/components/_shared/utils/wrapperProps";
import { Paragraph } from "@lib/components/Typography/compositions";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

/** Accepts all standard field description props except `className`, `render`, and `style`. Use `layoutClassName` for layout adjustments. */
export type DescriptionProps = ComponentWrapperProps<FieldDescriptionBaseProps>;

export const Description = React.forwardRef<HTMLParagraphElement, DescriptionProps>(function Description(props, ref) {
    const baseProps = resolveWrapperProps(props);
    return (
        <FieldBase.Description
            {...baseProps}
            ref={ref}
            className={resolveClassNames("text-neutral-subtle", baseProps.className)}
            render={<Paragraph size="sm" />}
        />
    );
});
