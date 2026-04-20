import type React from "react";

import { Separator as SeparatorBase, type SeparatorProps as SeparatorBaseProps } from "@base-ui/react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type SeparatorProps = Pick<SeparatorBaseProps, "orientation"> & {
    className?: React.HTMLAttributes<HTMLDivElement>["className"];
};

export function Separator(props: SeparatorProps) {
    const resolvedClassNames = resolveClassNames(
        props.className,
        "bg-neutral [:where(&+&)]:hidden shrink-0 self-stretch",
        props.orientation === "vertical" ? "w-px  mx-horizontal-3xs" : "h-px my-vertical-3xs",
    );
    return <SeparatorBase {...props} className={resolvedClassNames} />;
}
