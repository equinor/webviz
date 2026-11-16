import type { PopoverRootProps } from "@base-ui/react";
import { Popover } from "@base-ui/react";

export { Popover as PopoverBase } from "@base-ui/react/popover";

/** Accepts all standard popover root props from base-ui. */
export type RootProps<Payload = unknown> = PopoverRootProps<Payload>;

export function Root<Payload = unknown>(props: RootProps<Payload>) {
    return <Popover.Root {...props} />;
}
