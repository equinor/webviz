import { Typography, type TypographyProps } from "../Typography";

export type ParagraphProps = Omit<TypographyProps, "family" | "as">;

export function Paragraph(props: ParagraphProps) {
    return <Typography {...props} family="body" as="p" />;
}
