import React from "react";

export function withDefaults<T>(fc: React.FC<T>, defaults: Partial<T>): React.FC<T> {
    return (props: T) => fc(Object.assign({}, defaults, props));
}
