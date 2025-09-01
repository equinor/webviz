import React from "react";
import type { ItemElement, RootElement } from "./sortableList";

export type SortableListConfig = {
    itemElement: ItemElement;
    rootElement: RootElement;
};

export const SortableListConfigContext = React.createContext<SortableListConfig>({
    itemElement: "div",
    rootElement: "div",
});
