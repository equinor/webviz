import { DummyRandomCheck } from "./checks/DummyRandomCheck";
import { QcCheckRegistry } from "./QcCheckRegistry";

// TEMPORARY - see DummyRandomCheck.ts. Remove this registration together with that file once no
// longer needed for testing.
QcCheckRegistry.registerCheck("dummy-random-check", DummyRandomCheck);
