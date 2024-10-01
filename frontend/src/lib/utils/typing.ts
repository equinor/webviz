export type OptionalExceptFor<T, TRequired extends keyof T> = Partial<T> & Pick<T, TRequired>;

/**
 * Overwrites one or more fields in a type
 */
export type Modify<T, R> = Omit<T, keyof R> & R;
