export class Dependency<TReturnValue> {
    private _name: string;
    private _dependencies: Set<(value: TReturnValue) => void> = new Set();

    constructor(name: string) {
        this._name = name;
    }
}
