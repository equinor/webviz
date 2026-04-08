import { Field as FieldBase, type FieldErrorProps } from "@base-ui/react";

export type ErrorProps = Omit<FieldErrorProps, "className">;

export function Error(props: ErrorProps) {
    return (
        <FieldBase.Error className="" match={props.match}>
            {props.children}
        </FieldBase.Error>
    );
}
