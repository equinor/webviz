import React from "react";

import type { HTMLAttributes } from "react";

import { withDefaults } from "@lib/components/_shared/utils/defaultProps";
import type { ComponentWrapperProps } from "@lib/components/_shared/utils/wrapperProps";
import { resolveWrapperProps } from "@lib/components/_shared/utils/wrapperProps";
import { Typography } from "@lib/components/Typography";

export type ContentProps = ComponentWrapperProps<HTMLAttributes<HTMLElement>> & {
    /** The HTML element or component to render as. @default "p" */
    as?: React.ElementType;
    /** Font size of the content text. @default "md" */
    fontSize?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl";
    children: React.ReactNode;
};

const DEFAULT_PROPS = {
    fontSize: "md",
    as: "p",
} satisfies Partial<ContentProps>;

export const Content = React.forwardRef<HTMLElement, ContentProps>(function Content(props, ref) {
    const defaultedProps = withDefaults(props, DEFAULT_PROPS);
    const baseProps = resolveWrapperProps(defaultedProps, "fontSize", "as");

    return (
        <Typography {...baseProps} ref={ref} as={defaultedProps.as} family="body" size={defaultedProps.fontSize}>
            {defaultedProps.children}
        </Typography>
    );
});
