export type ToolbarProps = {
    hidden?: boolean;
    children: React.ReactNode;
};

export function Toolbar(props: ToolbarProps): React.ReactNode {
    if (props.hidden) {
        return null;
    }

    return (
        <div className="absolute left-0 top-0 bg-white p-1 rounded-sm border-gray-300 border shadow-sm z-30 text-sm flex gap-1 items-center">
            {props.children}
        </div>
    );
}
