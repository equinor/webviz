import { createContext, useContext } from "react";

import type { SelectableSize } from "@lib/newComponents/_shared/size";

export const ItemSizeContext = createContext<SelectableSize | null>(null);

export function useItemSizeContext(): SelectableSize {
    const context = useContext(ItemSizeContext);
    if (context === null) {
        throw new Error("Missing item size context. Table items must be used within a Table.Popup component");
    }

    return context;
}
