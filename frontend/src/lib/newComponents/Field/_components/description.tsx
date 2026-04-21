import { Field as FieldBase } from "@base-ui/react";

import { Paragraph } from "@lib/newComponents/Paragraph";

export type DescriptionProps = {
    children?: React.ReactNode;
};

export function Description(props: DescriptionProps) {
    return <FieldBase.Description {...props} className="text-neutral-subtle" render={<Paragraph size="sm" />} />;
}
