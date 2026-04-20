import type { PopoverRootProps } from "@base-ui/react";
import { Popover } from "@base-ui/react";

export { Popover as PopoverBase } from "@base-ui/react/popover";

export type RootProps = PopoverRootProps;

export function Root(props: RootProps) {
    return <Popover.Root {...props} />;
}
