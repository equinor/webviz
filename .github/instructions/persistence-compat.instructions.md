---
applyTo: "frontend/src/modules/**/persistence.ts,frontend/src/modules/_shared/jtd-schemas/**,frontend/src/framework/**/*.schema.ts"
description: "Use when changing JTD schemas or serialize/deserialize functions for persisted module state or workbench sessions."
---

# Backwards compatibility of persisted state

Module settings/view state and workbench sessions are stored as JSON (localStorage and backend sessions/snapshots) and validated with ajv JTD on load. In `frontend/src/framework/internal/ModuleInstanceSerializer.ts`, a failed validation discards the **entire** settings or view state of the module, which then falls back to defaults. Data written by older versions must keep validating against the current schema.

This is an interim measure until schema versioning with porters (#1807) is in place.

## Flag

Changes that make previously stored data fail validation:

- A new key under `properties` (required). Old data lacks it.
- A key removed or renamed from `properties` / `optionalProperties`. JTD rejects unknown keys unless `additionalProperties: true`, so old data with the old key fails.
- An enum value removed or renamed, including changed string values of enums used via `enum: Object.values(SomeEnum)`.
- Type narrowing, e.g. `nullable` removed, `string` → `enum`, wider → narrower int type, changed `elements`/`values` type.
- Changes to shared definitions in `frontend/src/modules/_shared/jtd-schemas/definitions/**` that do any of the above, since they affect every schema injecting them.
- A changed meaning of an existing key (same name and type, different semantics) without migration in the deserialize function.

## Expected fix

- New key: put it under `optionalProperties`, make the TS field optional (`foo?: T`) and rely on `setIfDefined` / the atom default when it is missing.
- Removed or renamed key: keep the old key under `optionalProperties` (ignored or mapped to the new key in the deserialize function).
- Removed enum value: keep accepting it in the schema and map it to a valid value in the deserialize function.
- Mark such backwards-compat fields with `// Optional for backward compat – awaiting schema versioning (#1807)` so they can be found and migrated later.

## Do not flag

- New keys under `optionalProperties`.
- Making a required key optional, adding `nullable: true` or adding enum values.
- Serialize/deserialize changes that don't alter the stored shape or meaning.
- Newly added modules or schemas with no previously stored data.

## Review comment format

Name the schema and field, which previously stored data now fails validation, and the suggested fix. State that the consequence is loss of all persisted settings/view state for the module (or the whole session for framework schemas).
