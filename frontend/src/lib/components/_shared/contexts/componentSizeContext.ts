import React from "react";

import type { SelectableSize } from "../utils/size";

export const ComponentSizeContext = React.createContext<SelectableSize>("default");

type PropsWithSize = {
    size?: SelectableSize;
};

/**
 * Grabs the components preferred size, prioritizing sizes defined in props, if any
 */
export function useComponentSize(props?: PropsWithSize) {
    const contextSize = React.useContext(ComponentSizeContext);
    return props?.size ?? contextSize;
}
