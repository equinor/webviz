import { Menu as BaseMenu } from "@base-ui/react/menu";

// Re-export base parts
export const Arrow = BaseMenu.Arrow;
export const Backdrop = BaseMenu.Backdrop;
export const CheckboxItem = BaseMenu.CheckboxItem;
export const CheckboxItemIndicator = BaseMenu.CheckboxItemIndicator;
export const Group = BaseMenu.Group;
export const GroupLabel = BaseMenu.GroupLabel;
export const LinkItem = BaseMenu.LinkItem;
export const Portal = BaseMenu.Portal;
export const Positioner = BaseMenu.Positioner;
export const RadioGroup = BaseMenu.RadioGroup;
export const RadioItem = BaseMenu.RadioItem;
export const RadioItemIndicator = BaseMenu.RadioItemIndicator;
export const Root = BaseMenu.Root;
export const SubmenuRoot = BaseMenu.SubmenuRoot;
export const Separator = BaseMenu.Separator;
export const Handle = BaseMenu.Handle;
export const createHandle = BaseMenu.createHandle;

// Customized parts
export { MenuItem as Item } from "./custom_parts/MenuItem";
export { MenuPopup as Popup } from "./custom_parts/MenuPopup";
export { MenuTrigger as Trigger } from "./custom_parts/MenuTrigger";
export { SubmenuTrigger as SubmenuTrigger } from "./custom_parts/SubmenuTrigger";
