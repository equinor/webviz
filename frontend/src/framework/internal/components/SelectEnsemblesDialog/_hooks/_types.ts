import type React from "react";

/**
 * Type representing a React state tuple with guaranteed initialization.
 * Similar to the return type of React.useState, but without the possibility of undefined values.
 */
export type StateTuple<T> = readonly [T, React.Dispatch<React.SetStateAction<T>>];
