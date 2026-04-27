import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Radio, RadioProps } from "../_baseComponents/radio";

export type RadioItemProps = RadioProps & {
    label?: string;
    children?: React.ReactNode;
    direction?: "horizontal" | "vertical";
};

const DEFAULT_PROPS = {
    direction: "horizontal",
} satisfies Partial<RadioItemProps>;

export function RadioItem(props: RadioItemProps) {
    const { label, children, direction, ...radioProps } = { ...DEFAULT_PROPS, ...props };

    return (
        <label
            data-disabled={radioProps.disabled || undefined}
            className={resolveClassNames("selectable gap-horizontal-xs flex items-center", {
                "flex-col": direction === "vertical",
            })}
            data-selectable-wrapper
        >
            <Radio {...radioProps} />
            {children ?? label}
        </label>
    );
}
