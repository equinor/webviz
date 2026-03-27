export type ContentProps = {
    children?: React.ReactNode;
};

export function Content(props: ContentProps) {
    return (
        <div className="group-data-[state=open]:animate-slideDown group-data-[state=closed]:animate-slideUp p-space-xs">
            {props.children}
        </div>
    );
}
