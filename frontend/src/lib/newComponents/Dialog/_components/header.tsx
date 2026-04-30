import { Close } from "./close";

export type HeaderProps = {
    closeIconVisible?: boolean;
    children: React.ReactNode;
};

export function Header(props: HeaderProps) {
    // The "dialog__popup__child" class can be found in the dialog.css file in the styles/components folder
    return (
        <div className="dialog__popup__child gap-vertical-md border-neutral flex items-start justify-between border-b">
            {props.children}
            {props.closeIconVisible && <Close />}
        </div>
    );
}
