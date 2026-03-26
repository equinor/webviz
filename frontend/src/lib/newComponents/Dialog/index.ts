import { Actions, type ActionsProps } from "./_components/actions";
import { Content, type ContentProps } from "./_components/content";
import { Header, type HeaderProps } from "./_components/header";
import { Popup, type PopupProps } from "./_components/popup";
import { Title, type TitleProps } from "./_components/title";

const Dialog = {
    Popup,
    Title,
    Header,
    Content,
    Actions,
};

export type Dialog = {
    Popup: PopupProps;
    Title: TitleProps;
    Header: HeaderProps;
    Content: ContentProps;
    Actions: ActionsProps;
};

export default Dialog;
