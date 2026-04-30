export type BodyProps = {
    children?: React.ReactNode;
};

export function Body(props: BodyProps) {
    // The "dialog__popup__child" class can be found in the dialog.css file in the styles/components folder
    return <div className="dialog__popup__child">{props.children}</div>;
}
