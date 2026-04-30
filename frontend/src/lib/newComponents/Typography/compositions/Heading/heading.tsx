import React from "react";

import { Typography, type TypographyProps } from "../../typography";

export type HeadingProps = {
    as: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
} & Omit<TypographyProps, "as" | "family" | "size">;

const COMPONENT_TO_SIZE_CLASSES: Record<HeadingProps["as"], TypographyProps["size"]> = {
    h1: "6xl",
    h2: "5xl",
    h3: "4xl",
    h4: "3xl",
    h5: "2xl",
    h6: "xl",
};

function HeadingComponent(props: HeadingProps, ref: React.ForwardedRef<HTMLHeadingElement>): React.ReactNode {
    const { as, ...rest } = props;
    const size = COMPONENT_TO_SIZE_CLASSES[as];
    return <Typography ref={ref} {...rest} family="header" as={as} size={size} />;
}

export const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(HeadingComponent);
