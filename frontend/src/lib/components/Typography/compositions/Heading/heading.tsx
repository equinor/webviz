import React from "react";

import { Typography, type TypographyProps } from "../../typography";

export type HeadingProps = {
    /** HTML heading element to render. Determines both the tag and the preset text size. */
    as: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
} & Omit<TypographyProps, "as" | "family" | "size">;

// We are diverging from the EDS specs here to have headings more usable in a dashboard application.
const COMPONENT_TO_SIZE_CLASSES: Record<HeadingProps["as"], TypographyProps["size"]> = {
    h1: "4xl",
    h2: "3xl",
    h3: "2xl",
    h4: "xl",
    h5: "lg",
    h6: "md",
};

function HeadingComponent(props: HeadingProps, ref: React.ForwardedRef<HTMLHeadingElement>): React.ReactNode {
    const { as, ...rest } = props;
    const size = COMPONENT_TO_SIZE_CLASSES[as];
    return <Typography ref={ref} {...rest} family="header" as={as} size={size} />;
}

export const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(HeadingComponent);
