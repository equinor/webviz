import type React from "react";

import type { Many } from "lodash";
import { omit } from "lodash";
import { Prettify } from "./prettify";

export type LayoutClassProps = {
    /** Class names applied to the element. Should only be used for adjusting layout (margins, visibility, positioning) */
    layoutClassName?: string;

    /** Styles applied to the element. Should only be used for adjusting layout (margins, visibility, positioning) */
    layoutStyle?: React.CSSProperties;
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
    TWrappedProps extends ComponentWrapperProps<any>,
    TOmitKeys extends keyof TWrappedProps = never,
>(
    props: TWrappedProps,
    ...additionalOmitPaths: Array<Many<TOmitKeys>>
): Prettify<Omit<TWrappedProps, TOmitKeys | keyof LayoutClassProps> & { className?: string; style?: React.CSSProperties }> {
    // Neither className, render, nor style are omitted here because we might make use of them when using
    // wrapped components in other library components. By omitting them in the type definition of ComponentWrapperProps,
    // we prevent implementers from passing these props and bypassing the design system while still allowing us to use them
    // at runtime when necessary.
    const p = props as any;
    const baseProps = omit(
        props,
        "layoutClassName",
        "layoutStyle",
        "style" as keyof TWrappedProps,
        "className" as keyof TWrappedProps,
        ...additionalOmitPaths,
    );

    return {
        className: `${p.className ?? ""} ${p.layoutClassName ?? ""}`.trim(),
        style: { ...p.style, ...p.layoutStyle },
        ...baseProps,
    } as any;
}
