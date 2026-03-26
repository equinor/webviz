import { Actions, type ActionsProps } from "./_components/actions";
import { Content, type ContentProps } from "./_components/content";
import { Description, DescriptionProps } from "./_components/description";
import { Header, type HeaderProps } from "./_components/header";
import { Popup, type PopupProps } from "./_components/popup";
import { Title, type TitleProps } from "./_components/title";

export const Dialog = {
    Popup,
    Title,
    Header,
    Content,
    Actions,
    Description,
};

export type Dialog = {
    Popup: PopupProps;
    Title: TitleProps;
    Header: HeaderProps;
    Content: ContentProps;
    Actions: ActionsProps;
    Description: DescriptionProps;
};
