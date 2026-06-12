export type Action = {
    id: string;
    label: string | React.ReactNode;
    icon?: React.ReactNode;
    description?: string;
    disabled?: boolean;
    tooltip?: string;
    checked?: boolean;
};

export type SubMenu = {
    id: string;
    label: string;
    items: MenuItem[];
    icon?: React.ReactNode;
    description?: string;
    disabled?: boolean;
};

export type Divider = {
    type: "divider";
};

export type MenuItem = Action | SubMenu | Divider;
