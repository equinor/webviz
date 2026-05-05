import { Field as FieldBase } from "@base-ui/react";
import type { FieldDescriptionProps as FieldDescriptionBaseProps } from "@base-ui/react";

import { useWrappedBaseUIProps, type WrappedBaseUIProps } from "@lib/newComponents/_shared/useWrappedBaseUIProps";
import { Paragraph } from "@lib/newComponents/Typography/compositions";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type DescriptionProps = WrappedBaseUIProps<FieldDescriptionBaseProps>;

export function Description(props: DescriptionProps) {
    const baseProps = useWrappedBaseUIProps(props);
    return (
        <FieldBase.Description
            {...baseProps}
            className={resolveClassNames("text-neutral-subtle", props.layoutClassName)}
            render={<Paragraph size="sm" />}
        />
    );
}
