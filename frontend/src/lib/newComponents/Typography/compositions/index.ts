// Intentional outlier: Typography compositions use sub-folders with their own index.ts so consumers
// can import { Heading } / { Paragraph } directly without a TypographyCompositions.* prefix.
export { Paragraph, type ParagraphProps } from "./Paragraph";
export { Heading, type HeadingProps } from "./Heading";
