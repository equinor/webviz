import { EnsembleIdentInterface } from "./EnsembleIdentInterface";

export class DeltaEnsembleIdent implements EnsembleIdentInterface<DeltaEnsembleIdent> {
    private _uuid: string;
    private _ensembleName: string;

    constructor(uuid: string, ensembleName: string) {
        this._uuid = uuid;
        this._ensembleName = ensembleName;
    }

    static fromUuidAndName(uuid: string, ensembleName: string): DeltaEnsembleIdent {
        return new DeltaEnsembleIdent(uuid, ensembleName);
    }

    static uuidAndEnsembleNameToString(uuid: string, ensembleName: string): string {
        return `${uuid}~@@~${ensembleName}`;
    }

    static isValidDeltaEnsembleIdentString(deltaEnsembleIdentString: string): boolean {
        const regex = DeltaEnsembleIdent.getDeltaEnsembleIdentRegex();
        const result = regex.exec(deltaEnsembleIdentString);
        return !!result && !!result.groups && !!result.groups.uuid && !!result.groups.name;
    }

    static fromString(deltaEnsembleIdentString: string): DeltaEnsembleIdent {
        const regex = DeltaEnsembleIdent.getDeltaEnsembleIdentRegex();
        const result = regex.exec(deltaEnsembleIdentString);
        if (!result || !result.groups || !result.groups.uuid || !result.groups.name) {
            throw new Error(`Invalid ensemble ident: ${deltaEnsembleIdentString}`);
        }

        const { uuid, name } = result.groups;

        return new DeltaEnsembleIdent(uuid, name);
    }

    private static getDeltaEnsembleIdentRegex(): RegExp {
        return /^(?<uuid>)~@@~(?<name>.*)$/;
    }

    getEnsembleName(): string {
        return this._ensembleName;
    }

    toString(): string {
        return DeltaEnsembleIdent.uuidAndEnsembleNameToString(this._uuid, this._ensembleName);
    }

    equals(otherIdent: DeltaEnsembleIdent | null): boolean {
        if (!otherIdent) {
            return false;
        }
        if (otherIdent === this) {
            return true;
        }

        return this._uuid === otherIdent._uuid && this._ensembleName === otherIdent._ensembleName;
    }
}
