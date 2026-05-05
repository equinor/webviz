import type { Many } from "lodash";
import { omit } from "lodash";
import type { BaseUIComponentProps } from "node_modules/@base-ui/react/esm/utils/types";

/** Utility type for base-ui wrapper classes. Removes the class-name and render function from the prop, as these tend to give implementers too much freedom. We also reintroduce a layoutClassName prop to make it clear that classnames should only be used for layout values (like margins, width, position) */
export type WrappedBaseUIProps<BaseUIProps extends BaseUIComponentProps<any, any>> = Omit<
    BaseUIProps,
    "className" | "render" | "style"
> & {
    /** Class names applied to the element. Should only be used for adjusting layout (margins, visibility, positioning) */
    layoutClassName?: string;
};

export function useWrappedBaseUIProps<
    BaseUIProps extends BaseUIComponentProps<any, any>,
    WrappedProps extends WrappedBaseUIProps<BaseUIProps>,
>(props: WrappedProps, ...additionalOmitPaths: Array<Many<keyof WrappedProps>>): BaseUIProps {
    const baseProps = omit(props, "layoutClassName", ...additionalOmitPaths);

    return { className: props.layoutClassName, ...baseProps } as BaseUIProps;
}
