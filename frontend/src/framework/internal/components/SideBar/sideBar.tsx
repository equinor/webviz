import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type SideBarProps = {
    children?: React.ReactNode;
    position: "left" | "right";
    className?: string;
};

export function SideBar(props: SideBarProps) {
    return (
        <div
            className={resolveClassNames(
                "bg-fill-surface z-base border-stroke-neutral-subtle pt-space-xs flex flex-col",
                props.position === "left" ? "border-r" : "border-l",
                props.className,
            )}
        >
            {props.children}
        </div>
    );
}
