import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type MenuTextProps = {
    classNames?: string;
    style?: React.CSSProperties;
    children: React.ReactNode;
};

export function MenuText(props: MenuTextProps): React.ReactNode {
    return (
        <div
            className={resolveClassNames("text-xs text-gray-500 tracking-wider px-3 py-1", props.classNames ?? "")}
            style={props.style}
        >
            {props.children}
        </div>
    );
}
