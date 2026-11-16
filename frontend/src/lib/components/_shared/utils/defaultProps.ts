import { defaults } from "lodash";

import type { Prettify } from "./prettify";

type WithDefaults<TProps, TDefaults extends Partial<TProps>> = Prettify<
    Omit<TProps, keyof TDefaults> & Required<Pick<TProps, Extract<keyof TDefaults, keyof TProps>>>
>;

export function withDefaults<TProps extends object, TDefaults extends Partial<TProps>>(
    props: TProps,
    defaultProps: TDefaults,
): WithDefaults<TProps, TDefaults> {
    return defaults({}, props, defaultProps) as any;
}
