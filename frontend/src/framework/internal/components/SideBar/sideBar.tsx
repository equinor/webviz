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
                "bg-surface z-base border-neutral-subtle flex flex-col",
                props.position === "left" ? "border-r" : "border-l",
                props.className,
            )}
        >
            {props.children}
        </div>
    );
}
