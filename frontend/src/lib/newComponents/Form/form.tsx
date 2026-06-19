import { Form as FormBase } from "@base-ui/react";
import type { FormProps as FormBaseProps } from "@base-ui/react";
import { ComponentWrapperProps, resolveWrapperProps } from "../_shared/utils/wrapperProps";

export type FormProps = ComponentWrapperProps<FormBaseProps>;

export function Form(props: FormProps): React.ReactNode {
    const baseProps = resolveWrapperProps(props);

    return <FormBase {...baseProps} />;
}
