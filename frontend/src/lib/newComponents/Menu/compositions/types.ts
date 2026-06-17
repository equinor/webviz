export type Action = {
    /** Unique identifier passed to `onActionClicked`. */
    id: string;
    /** The display text or element for this action. */
    label: string | React.ReactNode;
    /** Optional icon rendered before the label. */
    icon?: React.ReactNode;
    /** Optional secondary text shown below the label. */
    description?: string;
    /** When true, prevents the action from being clicked. */
    disabled?: boolean;
    /** Tooltip shown when hovering over this action. */
    tooltip?: string;
    /** When provided, renders the item as a checkbox with this checked state. */
    checked?: boolean;
};

export type SubMenu = {
    /** Unique identifier for this group. */
    id: string;
    /** The label shown in the submenu trigger. */
    label: string;
    /** The nested menu items. */
    items: MenuItem[];
    /** Optional icon rendered before the label. */
    icon?: React.ReactNode;
    /** Optional secondary text shown below the label. */
    description?: string;
    /** When true, prevents the submenu from being opened. */
    disabled?: boolean;
};

export type Divider = {
    /** Discriminant that identifies this item as a visual separator. */
    type: "divider";
};

export type MenuItem = Action | SubMenu | Divider;
