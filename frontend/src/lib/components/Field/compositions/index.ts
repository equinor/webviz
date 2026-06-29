import { Default } from "./default";
import { GenericErrors } from "./genericErrors";

export { ValidityMessages } from "./genericErrors";

export type { DefaultProps as FieldCompositionsDefaultProps } from "./default";
export type { GenericErrorsProps as FieldCompositionsGenericErrorsProps } from "./genericErrors";

export const FieldCompositions = {
    Default,
    GenericErrors,
} as const;
