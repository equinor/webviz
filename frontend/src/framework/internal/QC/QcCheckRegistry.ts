import type { QcCheckDefinition } from "./QcCheck";

export class QcCheckRegistry {
    // `any` since each check has its own params type
    private static _registeredChecks: Map<string, QcCheckDefinition<any>> = new Map();

    static getRegisteredCheck(id: string): QcCheckDefinition<any> | undefined {
        return this._registeredChecks.get(id);
    }

    static getRegisteredChecks(): Map<string, QcCheckDefinition<any>> {
        return this._registeredChecks;
    }

    static registerCheck(id: string, check: QcCheckDefinition<any>): void {
        if (this._registeredChecks.has(id)) {
            throw new Error(`Check with id ${id} is already registered.`);
        }
        this._registeredChecks.set(id, check);
    }
}
