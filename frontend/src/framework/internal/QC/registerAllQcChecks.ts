import { DummyRandomCheck } from "./checks/DummyRandomCheck";
import { HydrostaticEquilibriumCheck } from "./checks/HydrostaticEquilibriumCheck";
import { QcCheckRegistry } from "./QcCheckRegistry";

QcCheckRegistry.registerCheck("hydrostatic-equilibrium", HydrostaticEquilibriumCheck);
// TEMPORARY - see DummyRandomCheck.ts. Remove this registration together with that file once no
// longer needed for testing.
QcCheckRegistry.registerCheck("dummy-random-check", DummyRandomCheck);
