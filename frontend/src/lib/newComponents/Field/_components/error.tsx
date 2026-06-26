import React from "react";

import { Field as FieldBase, type FieldErrorProps } from "@base-ui/react";

import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import { Paragraph } from "@lib/newComponents/Typography/compositions";

/** Accepts all standard field error props except `className`, `render`, and `style`. Use `layoutClassName` for layout adjustments. */
export type ErrorProps = ComponentWrapperProps<FieldErrorProps>;

export const Error = React.forwardRef<HTMLDivElement, ErrorProps>(function Error(props, ref) {
    const baseProps = resolveWrapperProps(props);
    return <FieldBase.Error {...baseProps} ref={ref} render={<Paragraph size="sm" />} />;
});
