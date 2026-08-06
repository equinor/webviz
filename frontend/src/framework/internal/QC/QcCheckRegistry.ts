import type { QcCheckDefinition } from "./QcCheck";

export class QcCheckRegistry {
    private static _registeredChecks: Map<string, QcCheckDefinition> = new Map<string, QcCheckDefinition>();

    static getRegisteredCheck(id: string): QcCheckDefinition | undefined {
        return this._registeredChecks.get(id);
    }

    static getRegisteredChecks(): Map<string, QcCheckDefinition> {
        return this._registeredChecks;
    }

    static registerCheck(id: string, check: QcCheckDefinition): void {
        if (this._registeredChecks.has(id)) {
            throw new Error(`Check with id ${id} is already registered.`);
        }
        this._registeredChecks.set(id, check);
    }
}
