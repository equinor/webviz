import React from "react";

import { OpenInNew } from "@mui/icons-material";

import { useComponentSize } from "@lib/components/_shared/contexts/componentSizeContext";
import type { SelectableSize } from "@lib/components/_shared/utils/size";
import { getDataAttributesForSelectableSize } from "@lib/components/_shared/utils/size";
import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/components/_shared/utils/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { ButtonStyleProps } from "../_utils/resolveButtonStyle";
import { resolveButtonClassNames, resolveButtonLabelClassNames, STYLE_PROP_KEYS } from "../_utils/resolveButtonStyle";

type WrapperProps = ComponentWrapperProps<React.AnchorHTMLAttributes<HTMLAnchorElement>>;
export type LinkButtonProps = WrapperProps & ButtonStyleProps & { external?: boolean; size?: SelectableSize };

function LinkButtonComponent(props: LinkButtonProps, ref: React.ForwardedRef<HTMLAnchorElement>): React.ReactNode {
    const baseProps = resolveWrapperProps(props, "size", "external", ...STYLE_PROP_KEYS);
    const size = useComponentSize(props);

    return (
        <a
            ref={ref}
            {...baseProps}
            {...getDataAttributesForSelectableSize(size, true)}
            className={resolveClassNames(baseProps.className, resolveButtonClassNames(size, props))}
            tabIndex={props.disabled ? -1 : undefined}
            style={{
                minHeight: "calc(var(--eds-selectable-space-vertical) * 2 + round(1cap , 4px))",
                ...baseProps.style,
            }}
        >
            {props.iconOnly ? (
                <>
                    {props.children}
                    {props.external && <OpenInNew />}
                </>
            ) : (
                <span className={resolveButtonLabelClassNames(size)}>
                    {props.children} {props.external && <OpenInNew />}
                </span>
            )}
        </a>
    );
}

export const LinkButton = React.forwardRef(LinkButtonComponent);
