import type React from "react";

import type { FieldValidityProps as FieldValidityBaseProps } from "@base-ui/react";
import { Field as FieldBase } from "@base-ui/react";

export type ValidityProps = FieldValidityBaseProps;

export function Validity(props: ValidityProps): React.ReactNode {
    return <FieldBase.Validity {...props} />;
}
