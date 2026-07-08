import React from "react";

export const TableSectionContext = React.createContext<"head" | "body" | "foot">("body");

export function useTableSectionContext(): "head" | "body" | "foot" {
    return React.useContext(TableSectionContext);
}
