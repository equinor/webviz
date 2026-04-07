import { Field as FieldBase } from "@base-ui/react";

export type RootProps = {
    children?: React.ReactNode;
};

export function Root(props: RootProps) {
    return <FieldBase.Root className="flex flex-col gap-1">{props.children}</FieldBase.Root>;
}
