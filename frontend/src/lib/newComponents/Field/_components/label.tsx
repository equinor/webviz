import { Field as FieldBase } from "@base-ui/react";
import { Info } from "@mui/icons-material";

import { Button } from "@lib/newComponents/Button";

export type LabelProps = {
    children: React.ReactNode;
    info?: string;
};

export function Label(props: LabelProps) {
    return (
        <FieldBase.Label className="flex w-full items-center justify-between gap-2">
            {props.children}
            {props.info && (
                <Button variant="text" tone="neutral" size="small" iconOnly round>
                    <Info fontSize="inherit" />
                </Button>
            )}
        </FieldBase.Label>
    );
}
