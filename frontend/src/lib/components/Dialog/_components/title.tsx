import { Dialog as DialogBase } from "@base-ui/react";

import { Heading } from "@lib/components/Typography/compositions";

export type TitleProps = {
    children?: React.ReactNode;
};

export function Title(props: TitleProps) {
    return (
        <DialogBase.Title
            render={(baseProps) => (
                <Heading as="h4" {...baseProps}>
                    {props.children}
                </Heading>
            )}
        />
    );
}
