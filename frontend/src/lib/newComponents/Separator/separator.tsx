import { Separator as SeparatorBase, type SeparatorProps as SeparatorBaseProps } from "@base-ui/react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type SeparatorProps = Pick<SeparatorBaseProps, "orientation">;

export function Separator(props: SeparatorProps) {
    const resolvedClassNames = resolveClassNames(
        "bg-neutral [:where(&+&)]:hidden flex-shrink-0",
        props.orientation === "vertical" ? "w-px self-stretch mx-1" : "h-px w-full my-1",
    );
    return <SeparatorBase {...props} className={resolvedClassNames} />;
}
