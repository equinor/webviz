import { Dialog as DialogBase } from "@base-ui/react";

import { Heading } from "@lib/newComponents/Typography/_compositions/Heading";

export type TitleProps = {
    children?: React.ReactNode;
};

export function Title(props: TitleProps) {
    return (
        <DialogBase.Title
            render={(baseProps) => (
                <Heading as="h6" {...baseProps}>
                    {props.children}
                </Heading>
            )}
        />
    );
}
