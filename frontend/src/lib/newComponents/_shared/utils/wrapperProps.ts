import type { Many } from "lodash";
import { omit } from "lodash";

export type LayoutClassProps = {
    /** Class names applied to the element. Should only be used for adjusting layout (margins, visibility, positioning) */
    layoutClassName?: string;

    /** Styles applied to the element. Should only be used for adjusting layout (margins, visibility, positioning) */
    layoutStyles?: React.CSSProperties;
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
    // Neither className, render, nor style are omitted here because we might make use of them when using
    // wrapped components in other library components. By omitting them in the type definition of ComponentWrapperProps,
    // we prevent implementers from passing these props and bypassing the design system while still allowing us to use them
    // at runtime when necessary.
    const baseProps = omit(
        props,
        "layoutClassName",
        "layoutStyles",
        "className" as keyof TWrappedProps,
        ...additionalOmitPaths,
    );

    return {
        className: `${props.className ?? ""} ${props.layoutClassName ?? ""}`.trim(),
        style: { ...props.styles, ...props.layoutStyles },
        ...baseProps,
    } as unknown as TBaseUIProps;
}
