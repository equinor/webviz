import type { CustomGroupImplementation } from "../../interfacesAndTypes/customGroupImplementation";

export class View implements CustomGroupImplementation {
    getDefaultName(): string {
        return "View";
    }
}
