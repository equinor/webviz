import type React from "react";

import type { TooltipProviderProps as TooltipProviderBaseProps } from "@base-ui/react";
import { Tooltip as TooltipBase } from "@base-ui/react";

export type ProviderProps = TooltipProviderBaseProps;

export function Provider(props: ProviderProps): React.ReactNode {
    return <TooltipBase.Provider {...props} />;
}
