import { EnsembleIdentInterface } from "./EnsembleIdentInterface";

export interface EnsembleInterface {
    getIdent(): EnsembleIdentInterface<any>;
    getDisplayName(): string;
    getEnsembleName(): string;
    getRealizations(): readonly number[];
    getRealizationCount(): number;
    getMaxRealizationNumber(): number | undefined;
    // getParemters(): EnsembleParameters;
    // getSensitivities(): EnsembleSensitivities | null;
    getColor(): string;
    getCustomName(): string | null;
}
