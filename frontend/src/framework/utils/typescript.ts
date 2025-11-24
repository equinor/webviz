export type MakeReadonly<T> = {
    readonly [P in keyof T]: T[P];
};
