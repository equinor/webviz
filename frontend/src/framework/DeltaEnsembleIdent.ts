import { EnsembleIdent } from "./EnsembleIdent";
import { EnsembleIdentInterface } from "./EnsembleIdentInterface";
import { ensembleIdentUuidRegexString } from "./utils/ensembleIdentUtils";

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
            !!result.groups.firstCaseUuid &&
            !!result.groups.firstEnsembleName &&
            !!result.groups.secondCaseUuid &&
            !!result.groups.secondEnsembleName
        );
    }

    static fromString(deltaEnsembleIdentString: string): DeltaEnsembleIdent {
        const regex = DeltaEnsembleIdent.getDeltaEnsembleIdentRegex();
        const result = regex.exec(deltaEnsembleIdentString);
        if (
            !result ||
            !result.groups ||
            !result.groups.uuid ||
            !result.groups.firstCaseUuid ||
            !result.groups.firstEnsembleName ||
            !result.groups.secondCaseUuid ||
            !result.groups.secondEnsembleName
        ) {
            throw new Error(`Invalid ensemble ident: ${deltaEnsembleIdentString}`);
        }

        const { uuid, firstCaseUuid, firstEnsembleName, secondCaseUuid, secondEnsembleName } = result.groups;

        return new DeltaEnsembleIdent(
            uuid,
            new EnsembleIdent(firstCaseUuid, firstEnsembleName),
            new EnsembleIdent(secondCaseUuid, secondEnsembleName)
        );
    }

    private static getDeltaEnsembleIdentRegex(): RegExp {
        const ensembleIdentRegexString = EnsembleIdent.getEnsembleIdentRegexStringWithoutAnchors();
        const firstEnsembleIdentRegexString = ensembleIdentRegexString
            .replace("caseUuid", "firstCaseUuid")
            .replace("ensembleName", "firstEnsembleName");
        const secondEnsembleIdentRegexString = ensembleIdentRegexString
            .replace("caseUuid", "secondCaseUuid")
            .replace("ensembleName", "secondEnsembleName");
        return new RegExp(
            `^(?<uuid>${ensembleIdentUuidRegexString()})~@@~${firstEnsembleIdentRegexString}~@@~${secondEnsembleIdentRegexString}$`
        );
    }

    getUuid(): string {
        return this._uuid;
    }

    getEnsembleName(): string {
        return this._ensembleName;
    }

    getFirstEnsembleIdent(): EnsembleIdent {
        return this._firstEnsembleIdent;
    }

    getSecondEnsembleIdent(): EnsembleIdent {
        return this._secondEnsembleIdent;
    }

    toString(): string {
        return DeltaEnsembleIdent.uuidAndEnsembleIdentStringsToString(
            this._uuid,
            this._firstEnsembleIdent.toString(),
            this._secondEnsembleIdent.toString()
        );
    }

    equals(otherIdent: EnsembleIdentInterface<any> | null): boolean {
        if (!otherIdent || !(otherIdent instanceof DeltaEnsembleIdent)) {
            return false;
        }
        if (otherIdent === this) {
            return true;
        }

        return this._uuid === otherIdent._uuid && this._ensembleName === otherIdent._ensembleName;
    }
}
