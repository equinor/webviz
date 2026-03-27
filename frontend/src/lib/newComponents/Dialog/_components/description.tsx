import { Paragraph } from "@lib/newComponents/Paragraph/paragraph";

export type DescriptionProps = {
    children?: React.ReactNode;
};

export function Description(props: DescriptionProps) {
    return <Paragraph size="md">{props.children}</Paragraph>;
}
