import React from "react";

import { RadioGroup as RadioGroupBase, type RadioGroupProps as RadioGroupBaseProps } from "@base-ui/react";

import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/components/_shared/utils/wrapperProps";

/** Accepts all standard radio group props except `className`, `render`, and `style`. Use `layoutClassName` for layout adjustments. */
export type RadioGroupProps = ComponentWrapperProps<RadioGroupBaseProps>;

export const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(function RadioGroup(props, ref) {
    const baseProps = resolveWrapperProps(props);

    return <RadioGroupBase {...baseProps} ref={ref} className={props.layoutClassName} />;
});
