import type React from "react";
import type { HTMLAttributes } from "react";

import { defaults } from "lodash";

import type { ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import { resolveWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import { Typography } from "@lib/newComponents/Typography";

export type ContentProps = ComponentWrapperProps<HTMLAttributes<HTMLElement>> & {
    as?: React.ElementType;
    fontSize?: "xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl";
    children: React.ReactNode;
};

const DEFAULT_PROPS = {
    fontSize: "md",
    as: "p",
} satisfies Partial<ContentProps>;

export function Content(props: ContentProps): React.ReactNode {
    const defaultedProps = defaults({}, props, DEFAULT_PROPS);
    const baseProps = resolveWrapperProps(props, "fontSize", "as");

    return (
        <Typography {...baseProps} as={defaultedProps.as} family="body" size={defaultedProps.fontSize}>
            {props.children}
        </Typography>
    );
}
