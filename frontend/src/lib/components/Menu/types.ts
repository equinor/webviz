import type { SizeName } from "@lib/utils/componentSize";

export type Action = {
    id: string;
    label: string | React.ReactNode;
    icon?: React.ReactNode;
    description?: string;
    disabled?: boolean;
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

export type Text = {
    type: "text";
    text: React.ReactNode;
    size?: SizeName;
};

export type MenuItem = Action | SubMenu | Divider | Text;
