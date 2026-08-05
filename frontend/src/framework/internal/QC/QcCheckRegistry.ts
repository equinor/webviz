class QcCheckRegistry {
    private _checks: Map<string, any> = new Map<string, any>();

    getChecks(): Map<string, any> {
        return this._checks;
    }

    registerCheck(name: string, check: any): void {
        if (this._checks.has(name)) {
            throw new Error(`Check with name ${name} is already registered.`);
        }
        this._checks.set(name, check);
    }
}

export const qcCheckRegistry = new QcCheckRegistry();
