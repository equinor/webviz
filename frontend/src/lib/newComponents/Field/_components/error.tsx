import { Field as FieldBase, type FieldErrorProps } from "@base-ui/react";

import { Paragraph } from "@lib/newComponents/Typography/_compositions/Paragraph";

export type ErrorProps = Omit<FieldErrorProps, "className">;

export function Error(props: ErrorProps) {
    return <FieldBase.Error {...props} className="text-neutral-subtle" render={<Paragraph size="sm" />} />;
}
