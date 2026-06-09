import { Description } from "./_components/description";
import { Error } from "./_components/error";
import { Info } from "./_components/info";
import { Label } from "./_components/label";
import { Root } from "./_components/root";
import { Validity } from "./_components/validity";

export const Field = {
    Root,
    Label,
    Description,
    Error,
    Info,
    Validity,
};

export type { RootProps as FieldRootProps } from "./_components/root";
export { useFieldState } from "./_components/FieldStateContext";
export type { FieldState } from "./_components/FieldStateContext";
export type { LabelProps as FieldLabelProps } from "./_components/label";
export type { DescriptionProps as FieldDescriptionProps } from "./_components/description";
export type { ErrorProps as FieldErrorProps } from "./_components/error";
export type { InfoProps as FieldInfoProps } from "./_components/info";
export type { ValidityProps as FieldValidityProps } from "./_components/validity";
