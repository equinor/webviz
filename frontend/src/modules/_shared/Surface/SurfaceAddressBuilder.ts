import type { SurfaceStandardResult_api, SurfaceStatisticFunction_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

import type {
    ObservedSurfaceAddress,
    RealizationSurfaceAddress,
    StatisticalSurfaceAddress,
    SurfaceAttribute,
} from "./surfaceAddress";
import { encodeSurfAddrStr, makeStdResAttribute, makeTagNameAttribute } from "./surfaceAddress";

export class SurfaceAddressBuilder {
    private _caseUuid: string | null = null;
    private _ensemble: string | null = null;
    private _name: string | null = null;
    private _attribute: SurfaceAttribute | null = null;
    private _realizationNum: number | null = null;
    private _isoTimeOrInterval: string | null = null;
    private _statisticFunction: SurfaceStatisticFunction_api | null = null;
    private _statisticRealizations: number[] | null = null;

    withEnsembleIdent(ensembleIdent: RegularEnsembleIdent): this {
        this._caseUuid = ensembleIdent.getCaseUuid();
        this._ensemble = ensembleIdent.getEnsembleName();
        return this;
    }

    withName(name: string): this {
        this._name = name;
        return this;
    }

    withAttribute(attribute: SurfaceAttribute): this {
        this._attribute = attribute;
        return this;
    }

    withTagNameAttribute(tagName: string): this {
        this._attribute = makeTagNameAttribute(tagName);
        return this;
    }

    withStdResAttribute(stdResName: SurfaceStandardResult_api, subName: string | null = null): this {
        this._attribute = makeStdResAttribute(stdResName, subName);
        return this;
    }

    withTimeOrInterval(isoTimeOrInterval: string | null): this {
        this._isoTimeOrInterval = isoTimeOrInterval;
        return this;
    }

    withRealization(realization: number): this {
        this._realizationNum = realization;
        return this;
    }

    withStatisticFunction(statisticFunction: SurfaceStatisticFunction_api): this {
        this._statisticFunction = statisticFunction;
        return this;
    }

    withStatisticRealizations(realizations: number[]): this {
        this._statisticRealizations = realizations;
        return this;
    }

    buildRealizationAddress(): RealizationSurfaceAddress {
        if (this._realizationNum === null) {
            throw new Error("Realization number not set");
        }

        this.assertThatCommonPropertiesAreSet(true);

        const retObj: RealizationSurfaceAddress = {
            addressType: "REAL",
            caseUuid: this._caseUuid!,
            ensemble: this._ensemble!,
            name: this._name!,
            attribute: this._attribute!,
            realizationNum: this._realizationNum,
            isoTimeOrInterval: this._isoTimeOrInterval,
        };
        return retObj;
    }

    buildObservedAddress(): ObservedSurfaceAddress {
        if (!this._isoTimeOrInterval) {
            throw new Error("Time or interval not set");
        }

        this.assertThatCommonPropertiesAreSet(false);

        const retObj: ObservedSurfaceAddress = {
            addressType: "OBS",
            caseUuid: this._caseUuid!,
            name: this._name!,
            attribute: this._attribute!,
            isoTimeOrInterval: this._isoTimeOrInterval,
        };
        return retObj;
    }

    buildStatisticalAddress(): StatisticalSurfaceAddress {
        if (this._statisticFunction == null) {
            throw new Error("Statistic function not set");
        }

        this.assertThatCommonPropertiesAreSet(true);

        const retObj: StatisticalSurfaceAddress = {
            addressType: "STAT",
            caseUuid: this._caseUuid!,
            ensemble: this._ensemble!,
            name: this._name!,
            attribute: this._attribute!,
            statFunction: this._statisticFunction,
            statRealizations: this._statisticRealizations,
            isoTimeOrInterval: this._isoTimeOrInterval,
        };
        return retObj;
    }

    buildRealizationAddrStr(): string {
        return encodeSurfAddrStr(this.buildRealizationAddress());
    }

    buildObservedAddrStr(): string {
        return encodeSurfAddrStr(this.buildObservedAddress());
    }

    buildStatisticalAddrStr(): string {
        return encodeSurfAddrStr(this.buildStatisticalAddress());
    }

    private assertThatCommonPropertiesAreSet(requireEnsemble: boolean): void {
        if (!this._caseUuid) {
            throw new Error("Case UUID not set");
        }
        if (requireEnsemble && !this._ensemble) {
            throw new Error("Ensemble name not set");
        }
        if (!this._name) {
            throw new Error("Surface name not set");
        }
        if (!this._attribute) {
            throw new Error("Surface attribute not set");
        }
    }
}
