export enum PolylineEditingMode {
    DRAW = "draw",
    ADD_POINT = "add_point",
    REMOVE_POINT = "remove_point",
    NONE = "none",
    IDLE = "idle",
}

export type ContextMenuItem = {
    icon?: React.ReactNode;
    label: string;
    onClick: () => void;
};

export enum PreferredViewLayout {
    HORIZONTAL = "horizontal",
    VERTICAL = "vertical",
}
