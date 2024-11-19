import { EnsembleIdent } from "./EnsembleIdent";
import { EnsembleIdentInterface } from "./EnsembleIdentInterface";
import { uuidRegexString } from "./utils/ensembleIdentUtils";

export class DeltaEnsembleIdent implements EnsembleIdentInterface<DeltaEnsembleIdent> {
    private _uuid: string;
    private _ensembleName: string;
    private _firstEnsembleIdent: EnsembleIdent;
    private _secondEnsembleIdent: EnsembleIdent;

    constructor(uuid: string, firstEnsembleIdent: EnsembleIdent, secondEnsembleIdent: EnsembleIdent) {
        this._uuid = uuid;
        this._ensembleName = `(${firstEnsembleIdent.getEnsembleName()}) - (${secondEnsembleIdent.getEnsembleName()})`;
        this._firstEnsembleIdent = firstEnsembleIdent;
        this._secondEnsembleIdent = secondEnsembleIdent;
    }

    static uuidAndEnsembleIdentStringsToString(
        uuid: string,
        firstEnsembleIdentString: string,
        secondEnsembleIdentString: string
    ): string {
        return `${uuid}~@@~${firstEnsembleIdentString}~@@~${secondEnsembleIdentString}`;
    }

    static isValidDeltaEnsembleIdentString(deltaEnsembleIdentString: string): boolean {
        const regex = DeltaEnsembleIdent.getDeltaEnsembleIdentRegex();
        const result = regex.exec(deltaEnsembleIdentString);
        return (
            !!result &&
            !!result.groups &&
            !!result.groups.uuid &&
            !!result.groups.firstEnsembleIdentString &&
            !!result.groups.secondEnsembleIdentString
        );
    }

    static fromString(deltaEnsembleIdentString: string): DeltaEnsembleIdent {
        const regex = DeltaEnsembleIdent.getDeltaEnsembleIdentRegex();
        const result = regex.exec(deltaEnsembleIdentString);
        if (
            !result ||
            !result.groups ||
            !result.groups.uuid ||
            !result.groups.firstEnsembleIdentString ||
            !result.groups.secondEnsembleIdentString
        ) {
            throw new Error(`Invalid ensemble ident: ${deltaEnsembleIdentString}`);
        }

        const { uuid, firstEnsembleIdentString, secondEnsembleIdentString } = result.groups;

        return new DeltaEnsembleIdent(
            uuid,
            EnsembleIdent.fromString(firstEnsembleIdentString),
            EnsembleIdent.fromString(secondEnsembleIdentString)
        );
    }

    private static getDeltaEnsembleIdentRegex(): RegExp {
        const ensembleIdentRegexString = EnsembleIdent.getEnsembleIdentRegex().source;
        return new RegExp(
            `^(?<uuid>${uuidRegexString()})~@@~(?<firstEnsembleIdentString>${ensembleIdentRegexString})~@@~(?<secondEnsembleIdentString>${ensembleIdentRegexString})$`
        );
    }

    getUuid(): string {
        return this._uuid;
    }

    getEnsembleName(): string {
        return this._ensembleName;
    }

    toString(): string {
        return DeltaEnsembleIdent.uuidAndEnsembleIdentStringsToString(
            this._uuid,
            this._firstEnsembleIdent.toString(),
            this._secondEnsembleIdent.toString()
        );
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
