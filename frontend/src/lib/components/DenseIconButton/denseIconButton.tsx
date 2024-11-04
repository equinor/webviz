import { resolveClassNames } from "@lib/utils/resolveClassNames";

export enum DenseIconButtonColorScheme {
    DEFAULT = "default",
    WARNING = "warning",
    SUCCESS = "success",
    DANGER = "danger",
}

const COLOR_SCHEMES: Record<DenseIconButtonColorScheme, string> = {
    [DenseIconButtonColorScheme.DEFAULT]: "hover:bg-blue-200 focus:outline-blue-600",
    [DenseIconButtonColorScheme.WARNING]: "hover:bg-yellow-200 focus:outline-yellow-600",
    [DenseIconButtonColorScheme.SUCCESS]: "hover:bg-green-200 focus:outline-green-600",
    [DenseIconButtonColorScheme.DANGER]: "hover:bg-red-200 focus:outline-red-600",
};

export type DenseIconButtonProps = {
    onClick?: () => void;
    colorScheme?: DenseIconButtonColorScheme;
    children: React.ReactNode;
    title?: string;
    disabled?: boolean;
};

export function DenseIconButton(props: DenseIconButtonProps): React.ReactNode {
    const colorScheme = COLOR_SCHEMES[props.colorScheme ?? DenseIconButtonColorScheme.DEFAULT];

    function handleClick(): void {
        if (props.onClick) {
            props.onClick();
        }
    }

    return (
        <button
            className={resolveClassNames("p-1 text-sm rounded flex gap-1 items-center", {
                [colorScheme + "text-gray-600 focus:outline focus:outline-1 hover:text-gray-900"]: !props.disabled,
                "text-gray-300": props.disabled,
            })}
            disabled={props.disabled}
            onClick={handleClick}
            title={props.title}
        >
            {props.children}
        </button>
    );
}
