import type React from "react";

export interface DrawPreviewFunc {
    (width: number, height: number): React.ReactNode | string;
}
