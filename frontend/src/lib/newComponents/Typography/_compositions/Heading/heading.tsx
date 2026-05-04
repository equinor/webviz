import { Typography, type TypographyProps } from "../..";

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

export function Heading(props: HeadingProps) {
    const { as, ...rest } = props;
    const size = COMPONENT_TO_SIZE_CLASSES[as];
    return <Typography {...rest} family="header" as={as} size={size} />;
}
