import type { LabelProps } from "@lib/components/Label";

import { Description, type DescriptionProps } from "./_components/description";
import { Details, type DetailsProps } from "./_components/details";
import { Error, type ErrorProps } from "./_components/error";
import { Label } from "./_components/label";
import { Root, type RootProps } from "./_components/root";

export const Field = {
    Root,
    Label,
    Description,
    Error,
    Details,
};

export type Field = {
    Root: RootProps;
    Label: LabelProps;
    Description: DescriptionProps;
    Error: ErrorProps;
    Details: DetailsProps;
};
