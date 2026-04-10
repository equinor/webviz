import { Actions } from "./_components/actions";
import { Close } from "./_components/close";
import { Body } from "./_components/content";
import { Description } from "./_components/description";
import { Header } from "./_components/header";
import { Popup } from "./_components/popup";
import { Title } from "./_components/title";

export const Dialog = {
    Popup,
    Title,
    Header,
    Body,
    Actions,
    Description,
    Close,
};

export type { ActionsProps as DialogActionsProps } from "./_components/actions";
export type { BodyProps as DialogBodyProps } from "./_components/content";
export type { DescriptionProps as DialogDescriptionProps } from "./_components/description";
export type { HeaderProps as DialogHeaderProps } from "./_components/header";
export type { PopupProps as DialogPopupProps } from "./_components/popup";
export type { TitleProps as DialogTitleProps } from "./_components/title";
