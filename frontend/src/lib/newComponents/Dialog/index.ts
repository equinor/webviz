import { Actions, type ActionsProps } from "./_components/actions";
import { Close } from "./_components/close";
import { Body, type BodyProps } from "./_components/content";
import type { DescriptionProps } from "./_components/description";
import { Description } from "./_components/description";
import { Header, type HeaderProps } from "./_components/header";
import { Popup, type PopupProps } from "./_components/popup";
import { Title, type TitleProps } from "./_components/title";

export const Dialog = {
    Popup,
    Title,
    Header,
    Body,
    Actions,
    Description,
    Close,
};

export type Dialog = {
    Popup: PopupProps;
    Title: TitleProps;
    Header: HeaderProps;
    Body: BodyProps;
    Actions: ActionsProps;
    Description: DescriptionProps;
};
