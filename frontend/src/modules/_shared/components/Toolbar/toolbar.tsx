export type ToolbarProps = {
    hidden?: boolean;
    children: React.ReactNode;
};

export function Toolbar(props: ToolbarProps): React.ReactNode {
    if (props.hidden) {
        return null;
    }

    return (
        <div className="bg-surface px-3xs py-3xs border-neutral-subtle z-elevated text-body-sm gap-x-3xs absolute top-0 left-0 flex items-center rounded border shadow-sm">
            {props.children}
        </div>
    );
}
