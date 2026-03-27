import { Heading } from "@lib/newComponents/Heading";

export type TitleProps = {
    children?: React.ReactNode;
};

export function Title(props: TitleProps) {
    return <Heading as="h6">{props.children}</Heading>;
}
