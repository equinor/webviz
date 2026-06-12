import React from "react";

import { RadioGroup as RadioGroupBase, type RadioGroupProps as RadioGroupBaseProps } from "@base-ui/react";

import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";

export type RadioGroupProps = ComponentWrapperProps<RadioGroupBaseProps>;

export const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(function RadioGroup(props, ref) {
    const baseProps = resolveWrapperProps(props);

    return <RadioGroupBase {...baseProps} ref={ref} className={props.layoutClassName} />;
});
