import { Log } from "@probe.gl/log";

export class GlobalLog {
    static registerLog(logId: string): Log {
        const log = new Log({ id: logId });
        Object.defineProperty(this, logId, {
            value: log,
            writable: false,
        });
        return log;
    }
}
