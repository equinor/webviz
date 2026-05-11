import { Menu as BaseMenu } from "@base-ui/react/menu";

// Re-export base parts
export const Backdrop = BaseMenu.Backdrop;
export const Group = BaseMenu.Group;
export const LinkItem = BaseMenu.LinkItem;
export const RadioGroup = BaseMenu.RadioGroup;
export const SubmenuRoot = BaseMenu.SubmenuRoot;
export const Handle = BaseMenu.Handle;
export const createHandle = BaseMenu.createHandle;

// Customized parts
export { MenuItem as Item } from "./custom_parts/MenuItem";
export { MenuPopup as Popup } from "./custom_parts/MenuPopup";
export { MenuTrigger as Trigger } from "./custom_parts/MenuTrigger";
export { SubmenuTrigger as SubmenuTrigger } from "./custom_parts/SubmenuTrigger";
export { MenuCheckBoxItem as CheckBoxItem } from "./custom_parts/CheckboxItem";
export { MenuRadioItem as RadioItem } from "./custom_parts/RadioItem";
export { MenuGroupLabel as GroupLabel } from "./custom_parts/GroupLabel";
export { MenuSeparator as Separator } from "./custom_parts/Separator";
export { MenuItemContent as ItemContent } from "./custom_parts/ItemContent";
export { MenuTextItem as TextItem } from "./custom_parts/TextItem";
export { MenuRoot as Root } from "./custom_parts/Root";
