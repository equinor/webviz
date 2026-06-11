import type React from "react";

import { Typography } from "@lib/newComponents/Typography";

export type ContentProps = {
    fontSize?: "xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl";
    children: React.ReactNode;
};

const DEFAULT_PROPS = {
    fontSize: "md",
} satisfies Partial<ContentProps>;

export function Content(props: ContentProps): React.ReactNode {
    const defaultedProps = { ...DEFAULT_PROPS, ...props };
    return (
        <Typography as="p" family="body" size={defaultedProps.fontSize}>
            {props.children}
        </Typography>
    );
}
