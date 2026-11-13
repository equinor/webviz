import React from "react";

import { MultilineChart } from "@mui/icons-material";

import type { CustomGroupImplementation } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customGroupImplementation";

export class DiffPlotGroup implements CustomGroupImplementation {
    getDefaultName(): string {
        return "Differential plot";
    }

    getIcon(): React.ReactNode {
        return React.createElement(MultilineChart, { fontSize: "inherit" });
    }
}
