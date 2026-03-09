export class DeserializationContext {
    private _errors: string[] = [];

    addError(error: string): void {
        this._errors.push(error);
    }

    getErrors(): readonly string[] {
        return this._errors;
    }

    hasErrors(): boolean {
        return this._errors.length > 0;
    }
}
