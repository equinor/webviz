import React from "react";

import { Field as FieldBase, type FieldErrorProps } from "@base-ui/react";

import { useWrappedBaseUIProps, type WrappedBaseUIProps } from "@lib/newComponents/_shared/useWrappedBaseUIProps";
import { Paragraph } from "@lib/newComponents/Typography/compositions";

export type ErrorProps = WrappedBaseUIProps<FieldErrorProps>;

function ErrorComponent(props: ErrorProps, ref: React.ForwardedRef<HTMLDivElement>): React.ReactNode {
    const baseProps = useWrappedBaseUIProps(props);
    return <FieldBase.Error {...baseProps} ref={ref} render={<Paragraph size="sm" />} />;
}

export const Error = React.forwardRef<HTMLDivElement, ErrorProps>(ErrorComponent);
