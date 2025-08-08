/* eslint-disable no-console */
import { getDebugSetting, setDebugSetting } from "@framework/internal/utils/debug";
import { formatHex } from "culori";
import { isArray } from "lodash";

let colorIndex = 0;

function getNextColor(): string {
    const goldenAngle = 137.508; // degrees
    const hue = (colorIndex++ * goldenAngle) % 360;
    const color = { mode: "hsl", h: hue, s: 0.7, l: 0.5 } as const;
    return formatHex(color); // → "#a05ce0", etc.
}

type CapitalLetter =
    | "A"
    | "B"
    | "C"
    | "D"
    | "E"
    | "F"
    | "G"
    | "H"
    | "I"
    | "J"
    | "K"
    | "L"
    | "M"
    | "N"
    | "O"
    | "P"
    | "Q"
    | "R"
    | "S"
    | "T"
    | "U"
    | "V"
    | "W"
    | "X"
    | "Y"
    | "Z";

type PascalCase = `${CapitalLetter}${string}`; // Start with uppercase

function isValidLoggerName(name: string): boolean {
    return /^[A-Z][a-zA-Z_]*[a-zA-Z]$/.test(name);
}

class ConsoleLogger {
    private _name: string;
    private _color: string;

    constructor(name: string, color: string) {
        this._name = name;
        this._color = color;
    }

    private _log(level: "debug" | "info" | "warn" | "error", ...args: unknown[]) {
        const prefix = `%c[${this._name}]`;
        const style = `color: ${this._color}; font-weight: bold`;
        console[level](prefix, style, ...args);
    }

    log(...args: unknown[]) {
        this._log("debug", ...args);
    }
}

class Logger {
    private _name: string;
    private _color: string;

    console: ConsoleLogger | undefined;

    constructor(name: string, color: string) {
        this._name = name;
        this._color = color;
    }

    enable() {
        if (!this.console) {
            this.console = new ConsoleLogger(this._name, this._color);
        }
    }

    disable() {
        this.console = undefined;
    }
}

type LoggerControl = {
    enable: () => void;
    disable: () => void;
};

const DEBUG_SETTING_NAME = "enabledLoggers";

class GlobalLog {
    private _registry: Record<string, Logger> = {};
    private _enabledLoggers: Set<string> = new Set();
    loggers: Record<string, LoggerControl> = Object.create(null);

    constructor() {
        // Initialize the global logger registry from localStorage if it exists
        const storedRegistry = getDebugSetting(DEBUG_SETTING_NAME);
        if (storedRegistry) {
            try {
                const parsed = JSON.parse(storedRegistry);
                if (!isArray(parsed)) {
                    console.error("Stored enabled loggers is not an array");
                    return;
                }
                for (const loggerName of parsed) {
                    if (typeof loggerName !== "string") {
                        console.error(`Invalid logger name: ${loggerName}`);
                        continue;
                    }
                    this._enabledLoggers.add(loggerName);
                }
            } catch (error) {
                console.error("Failed to parse enabled loggers entry from localStorage:", error);
            }
        }
    }

    private getLogger(name: string): Logger {
        return this._registry[name];
    }

    private setLoggerEnabled(name: string, enabled: boolean) {
        if (enabled) {
            if (!this._enabledLoggers.has(name)) {
                this._enabledLoggers.add(name);
                this.getLogger(name).enable();
            }
        } else {
            this._enabledLoggers.delete(name);
            this.getLogger(name).disable();
        }

        this.updateDebugSetting();
    }

    private updateDebugSetting() {
        // Update the localStorage entry with the current enabled loggers
        const enabledLoggersArray = Array.from(this._enabledLoggers);
        setDebugSetting(DEBUG_SETTING_NAME, JSON.stringify(enabledLoggersArray));
    }

    registerLogger<TName extends PascalCase>(name: TName, color?: string): Logger {
        if (!isValidLoggerName(name)) {
            throw Error(`Invalid logger name: "${name}". Must start with an uppercase letter and end with a letter.`);
        }

        if (name in this._registry) {
            console.warn(`Logger with name "${name}" already exists. Returning existing logger.`);
            return this.getLogger(name);
        }

        const loggerColor = color ?? getNextColor();
        const logger = new Logger(name, loggerColor);
        this._registry[name] = logger;
        this.loggers[name] = Object.create(null);
        this.loggers[name]["enable"] = () => {
            this.setLoggerEnabled(name, true);
            return `Logger "${name}" enabled.`;
        };
        this.loggers[name]["disable"] = () => {
            this.setLoggerEnabled(name, false);
            return `Logger "${name}" disabled.`;
        };

        return this.getLogger(name);
    }

    enableAll() {
        for (const name in this._registry) {
            this.setLoggerEnabled(name, true);
        }
        this.updateDebugSetting();
    }

    disableAll() {
        for (const name in this._registry) {
            this.setLoggerEnabled(name, false);
        }
        this.updateDebugSetting();
    }
}

export const globalLog = new GlobalLog();

const log = Object.create(null);
log.loggers = globalLog.loggers;
log.enableAll = () => globalLog.enableAll();
log.disableAll = () => globalLog.disableAll();
// @ts-expect-error This is a global variable for easy access in the application
globalThis.log = log;
