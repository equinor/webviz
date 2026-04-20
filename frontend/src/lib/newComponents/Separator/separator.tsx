import { Separator as SeparatorBase, type SeparatorProps as SeparatorBaseProps } from "@base-ui/react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type SeparatorProps = Pick<SeparatorBaseProps, "orientation">;

export function Separator(props: SeparatorProps) {
    const resolvedClassNames = resolveClassNames(
        "bg-neutral [:where(&+&)]:hidden shrink-0",
        props.orientation === "vertical" ? "w-px self-stretch mx-horizontal-3xs" : "h-px w-full my-vertical-3xs",
    );
    return <SeparatorBase {...props} className={resolvedClassNames} />;
}
