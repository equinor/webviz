import { CustomGroupImplementation } from "../../interfaces";

export class View implements CustomGroupImplementation {
    getDefaultName(): string {
        return "View";
    }
}
