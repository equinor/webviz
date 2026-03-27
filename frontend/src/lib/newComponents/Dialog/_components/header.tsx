import { Close } from "./close";

export type HeaderProps = {
    closeIconVisible?: boolean;
    children: React.ReactNode;
};

export function Header(props: HeaderProps) {
    return (
        <div className="popup__child gap-space-sm border-fill-neutral flex items-start justify-between border-b">
            {props.children}
            {props.closeIconVisible && <Close />}
        </div>
    );
}
