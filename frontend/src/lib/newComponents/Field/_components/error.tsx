import React from "react";

import { Field as FieldBase, type FieldErrorProps } from "@base-ui/react";

import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import { Paragraph } from "@lib/newComponents/Typography/compositions";

export type ErrorProps = ComponentWrapperProps<FieldErrorProps>;

function ErrorComponent(props: ErrorProps, ref: React.ForwardedRef<HTMLDivElement>): React.ReactNode {
    const baseProps = resolveWrapperProps(props);
    return <FieldBase.Error {...baseProps} ref={ref} render={<Paragraph size="sm" />} />;
}

export const Error = React.forwardRef<HTMLDivElement, ErrorProps>(ErrorComponent);
