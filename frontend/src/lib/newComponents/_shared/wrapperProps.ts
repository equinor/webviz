import type { Many } from "lodash";
import { omit } from "lodash";

export type LayoutClassProps = {
    /** Class names applied to the element. Should only be used for adjusting layout (margins, visibility, positioning) */
    layoutClassName?: string;
};

/**
 * Base props type for component wrappers. Removes `className`, `render`, and `style` to prevent
 * implementers from bypassing the design system. Reintroduces `layoutClassName` to signal that
 * class names should only be used for layout (margins, visibility, positioning).
 */
export type ComponentWrapperProps<TBaseUIProps extends Record<string, any>> = Omit<
    TBaseUIProps,
    "className" | "render" | "style"
> &
    LayoutClassProps;

export function resolveWrapperProps<
    TBaseUIProps extends Record<string, any>,
    TWrappedProps extends ComponentWrapperProps<TBaseUIProps>,
>(props: TWrappedProps, ...additionalOmitPaths: Array<Many<keyof TWrappedProps>>): TBaseUIProps {
    const baseProps = omit(props, "layoutClassName", ...additionalOmitPaths);

    return { className: props.layoutClassName, ...baseProps } as unknown as TBaseUIProps;
}
