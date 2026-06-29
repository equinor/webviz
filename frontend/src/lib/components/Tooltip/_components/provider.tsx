import React from "react";

import type { TooltipPositionerProps, TooltipProviderProps as TooltipProviderBaseProps } from "@base-ui/react";
import { Tooltip as TooltipBase } from "@base-ui/react";

type PositionProps = Pick<TooltipPositionerProps, "side" | "align">;

export type ProviderProps = TooltipProviderBaseProps & PositionProps;

export const TooltipProviderContext = React.createContext<null | PositionProps>(null);

export function Provider(props: ProviderProps): React.ReactNode {
    const { side, align, ...otherProps } = props;

    return (
        <TooltipBase.Provider {...otherProps}>
            <TooltipProviderContext.Provider value={{ side, align }}>{props.children}</TooltipProviderContext.Provider>
        </TooltipBase.Provider>
    );
}
