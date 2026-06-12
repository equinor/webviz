import React from "react";

import type { CheckboxGroupProps as CheckboxGroupBaseProps } from "@base-ui/react";
import { CheckboxGroup as CheckboxGroupBase } from "@base-ui/react";

import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";

export type CheckboxGroupProps = ComponentWrapperProps<CheckboxGroupBaseProps>;

export const CheckboxGroup = React.forwardRef<HTMLDivElement, CheckboxGroupProps>(function CheckboxGroup(props, ref) {
    const baseProps = resolveWrapperProps(props);

    return <CheckboxGroupBase {...baseProps} ref={ref} className={props.layoutClassName} />;
});
