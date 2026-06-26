import React from "react";

import { Form as FormBase } from "@base-ui/react";
import type { FormProps as FormBaseProps } from "@base-ui/react";

import { type ComponentWrapperProps, resolveWrapperProps } from "../_shared/utils/wrapperProps";

/** Accepts all standard form props except `className`, `render`, and `style`. Use `layoutClassName` for layout adjustments. */
export type FormProps = ComponentWrapperProps<FormBaseProps>;

export const Form = React.forwardRef<HTMLFormElement, FormProps>(function Form(props, ref) {
    const baseProps = resolveWrapperProps(props);

    return <FormBase {...baseProps} ref={ref} />;
});
