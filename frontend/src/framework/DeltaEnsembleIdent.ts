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
        const testResult = !!result && !!result.groups && !!result.groups.uuid && !!result.groups.ensembleName;
        return testResult;
    }

    static fromString(deltaEnsembleIdentString: string): DeltaEnsembleIdent {
        const regex = DeltaEnsembleIdent.getDeltaEnsembleIdentRegex();
        const result = regex.exec(deltaEnsembleIdentString);
        if (!result || !result.groups || !result.groups.uuid || !result.groups.ensembleName) {
            throw new Error(`Invalid ensemble ident: ${deltaEnsembleIdentString}`);
        }

        const { uuid, ensembleName } = result.groups;

        return new DeltaEnsembleIdent(uuid, ensembleName);
    }

    private static getDeltaEnsembleIdentRegex(): RegExp {
        return /^(?<uuid>[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12})~@@~(?<ensembleName>.*)$/;
    }

    getUuid(): string {
        return this._uuid;
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
