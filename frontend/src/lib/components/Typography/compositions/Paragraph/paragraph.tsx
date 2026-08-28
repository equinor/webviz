import React from "react";

import { Typography, type TypographyProps } from "../..";

export type ParagraphProps = Omit<TypographyProps, "family" | "as">;

function ParagraphComponent(props: ParagraphProps, ref: React.ForwardedRef<HTMLParagraphElement>): React.ReactNode {
    return <Typography ref={ref} {...props} family="body" as="p" />;
}

export const Paragraph = React.forwardRef<HTMLParagraphElement, ParagraphProps>(ParagraphComponent);
