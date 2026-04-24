import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Checkbox, CheckboxProps } from "../_baseComponents/checkbox";

export type CheckboxItemProps = CheckboxProps & {
    label?: string;
    children?: React.ReactNode;
    direction?: "horizontal" | "vertical";
};

const DEFAULT_PROPS = {
    direction: "horizontal",
} satisfies Partial<CheckboxItemProps>;

export function CheckboxItem(props: CheckboxItemProps) {
    const { label, children, direction, ...checkboxProps } = { ...DEFAULT_PROPS, ...props };

    return (
        <label
            data-disabled={checkboxProps.disabled}
            className={resolveClassNames("selectable gap-horizontal-xs flex items-center", {
                "flex-col": direction === "vertical",
            })}
            data-selectable-wrapper
        >
            <Checkbox {...checkboxProps} />
            {children ?? label}
        </label>
    );
}
