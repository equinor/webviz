import type { CustomGroupImplementation } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customGroupImplementation";

export class DiffPlotGroup implements CustomGroupImplementation {
    getDefaultName(): string {
        return "Differential plot";
    }
}
