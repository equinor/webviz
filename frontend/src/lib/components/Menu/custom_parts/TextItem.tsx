import type React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type MenuTextItemProps = { children: React.ReactNode; className: string };

export function MenuTextItem(props: MenuTextItemProps) {
    const baseClassName = "text-gray-500 tracking-wider px-3 py-1";

    return <div className={resolveClassNames(baseClassName, props.className)}>{props.children}</div>;
}
