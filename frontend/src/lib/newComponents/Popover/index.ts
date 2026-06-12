import { Content } from "./_components/content";
import { Popup } from "./_components/popup";
import { Root } from "./_components/root";
import { Title } from "./_components/title";
import { Trigger } from "./_components/trigger";

export type { RootProps as PopoverRootProps } from "./_components/root";
export type { TriggerProps as PopoverTriggerProps } from "./_components/trigger";
export type { PopupProps as PopoverPopupProps } from "./_components/popup";
export type { ContentProps as PopoverContentProps } from "./_components/content";
export type { TitleProps as PopoverTitleProps } from "./_components/title";

export const Popover = {
    Root,
    Trigger,
    Popup,
    Title,
    Content,
};
