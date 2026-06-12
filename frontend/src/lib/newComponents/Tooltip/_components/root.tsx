import type React from "react";

import type { TooltipRootProps as TooltipRootBaseProps } from "@base-ui/react";
import { Tooltip as TooltipBase } from "@base-ui/react";

export type RootProps = TooltipRootBaseProps;

export function Root(props: RootProps): React.ReactNode {
    return <TooltipBase.Root {...props} />;
}
