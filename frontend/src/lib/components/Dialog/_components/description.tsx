import { Dialog as DialogBase } from "@base-ui/react";

import { Paragraph } from "@lib/components/Typography/compositions";

export type DescriptionProps = {
    children?: React.ReactNode;
};

export function Description(props: DescriptionProps) {
    return (
        <DialogBase.Description
            render={(baseProps) => (
                <Paragraph size="md" {...baseProps}>
                    {props.children}
                </Paragraph>
            )}
        />
    );
}
