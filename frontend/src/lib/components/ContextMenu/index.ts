import { CheckboxItem } from "./_components/checkboxItem";
import { Group } from "./_components/group";
import { Item } from "./_components/item";
import { Menu } from "./_components/menu";
import { RadioGroup } from "./_components/radioGroup";
import { RadioItem } from "./_components/radioItem";
import { Root } from "./_components/root";
import { Separator } from "./_components/separator";
import { Submenu } from "./_components/subMenu";
import { Trigger } from "./_components/trigger";

export const ContextMenu = {
    Root,
    Trigger,
    Menu,
    Submenu,
    Item,
    RadioItem,
    CheckboxItem,
    RadioGroup,
    Group,
    Separator,
};

export type { RootProps as ContextMenuRootProps } from "./_components/root";
export type { TriggerProps as ContextMenuTriggerProps } from "./_components/trigger";
export type { MenuProps as ContextMenuMenuProps } from "./_components/menu";
export type { SubmenuProps as ContextMenuSubmenuProps } from "./_components/subMenu";
export type { ItemProps as ContextMenuItemProps } from "./_components/item";
export type { RadioItemProps as ContextMenuRadioItemProps } from "./_components/radioItem";
export type { CheckboxItemProps as ContextMenuCheckboxItemProps } from "./_components/checkboxItem";
export type { RadioGroupProps as ContextMenuRadioGroupProps } from "./_components/radioGroup";
export type { GroupProps as ContextMenuGroupProps } from "./_components/group";
