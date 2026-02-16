import type { Remote } from "comlink";

import { WebWorkerService } from "@lib/utils/WebWorkerService";

import CsvAssemblerWorker from "./csvAssemblerRegistry?worker";
import type { CsvAssemblerServiceApi } from "./types";

export class CsvAssemblerService {
    private service = new WebWorkerService<CsvAssemblerServiceApi>(CsvAssemblerWorker);

    get api(): Remote<CsvAssemblerServiceApi> {
        return this.service.getProxy();
    }

    get<K extends keyof CsvAssemblerServiceApi>(key: K): Remote<CsvAssemblerServiceApi>[K] {
        return this.service.getProxy()[key];
    }

    terminate(): void {
        this.service.terminate();
    }
}
