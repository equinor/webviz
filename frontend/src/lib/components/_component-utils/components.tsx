import React from "react";

// type WithDefaults<T, U> =
type OptionalKeys<T> = {
    [K in keyof T]-?: T[K] extends NonNullable<T[K]> ? never : K;
}[keyof T];
type AssignableKeys<T, U> = {
    [K in keyof U]-?: K extends keyof T ? K : never;
}[keyof U];
export type OptionalValues<T> = Pick<T, OptionalKeys<T>>;
type ValidValues<T, U> = Pick<U, AssignableKeys<T, U>>;

type WithDefaults<T, U extends OptionalValues<T>> = Omit<T, keyof U> & Pick<U, keyof ValidValues<T, U>>;

export function withDefaults<T extends { [key: string]: unknown }>(): <U extends OptionalValues<T>>(
    defaults: U,
    fc: React.FC<WithDefaults<T, U>>
) => React.FC<T> {
    return <U extends OptionalValues<T>>(defaults: U, fc: React.FC<WithDefaults<T, U>>) => {
        return (props: T) => {
            const propsKeys = Object.keys(props);
            const defaultKeys = Object.keys(defaults);
            const adjustedDefaults = Object.assign({}, defaults);
            for (const key in defaultKeys) {
                if (!propsKeys.includes(key)) {
                    delete adjustedDefaults[key as keyof U];
                }
            }
            const adjustedProps: WithDefaults<T, U> = Object.assign(
                {},
                adjustedDefaults,
                props
            ) as unknown as WithDefaults<T, U>;
            return fc(adjustedProps);
        };
    };
}
