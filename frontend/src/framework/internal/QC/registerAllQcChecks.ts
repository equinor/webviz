import { DummyRandomCheck } from "./checks/DummyRandomCheck";
import { QcCheckRegistry } from "./QcCheckRegistry";

// TEMPORARY - remove together with DummyRandomCheck.ts
QcCheckRegistry.registerCheck("dummy-random-check", DummyRandomCheck);
