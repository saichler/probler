# Global Rules

These are Claude Code global rules for the Layer8 ERP project. Load this file at the start of a session to apply all rules.

**Source files:** `~/.claude/rules/*.md` (17 rule files)

---

# Part 1: Generic Software Development Rules

These rules apply to any software project.

---

## 1.1 Code Maintainability Standards

**Source:** `maintainability.md`

### File Size
Files that are over 500 lines of code are not maintainable, please make sure to refactor them and break them into smaller files logically.

#### File Size Check (CRITICAL)
After ANY edit that adds more than 10 lines to a file, check the file's total line count.
If the file is approaching 450 lines, proactively split it before continuing.
If the file exceeds 500 lines, STOP and refactor immediately before proceeding.

### No Duplicate Code
Avoid duplicate code. Always check for existing utilities, functions, or components before writing new code. Consolidate duplicates into shared modules.

### Read Before Implementing
When asked to implement something similar to an existing component, you MUST read ALL the code of the referenced component(s) first. Do not make any assumptions. Read every file, understand every pattern, and only then implement following the exact same patterns.
- Use the Read tool to read the file completely. Show the key interfaces and props found. Then implement.

### Component Integration Analysis
When implementing support for a component, perform deep analysis first:
- Understand all initialization arguments and configuration options
- Understand how endpoints are constructed (if applicable)
- Understand how L8Query is constructed for paging, filtering, and sorting (if supported)
- Only proceed with implementation after full understanding is documented

### Vendor All Third-Party Dependencies
All third-party dependencies must be vendored. After adding or updating any dependency, run `go mod vendor` to ensure the `vendor/` directory is up to date. Never rely on module cache alone — the vendor directory is the source of truth for third-party code.

### Guidelines
- Target file size: under 500 lines of code
- Each file should have a single responsibility
- Refactor proactively when approaching the 500-line threshold
- Use logical module/package organization
- Check for existing shared utilities before creating new ones

---

## 1.2 Duplication Prevention Rules

**Source:** `maintainability.md`

### Second Instance Rule
When creating a second instance of any pattern (e.g., a second module, a second similar component), extract a shared abstraction immediately. Do not copy a file and replace identifiers. The second consumer is the forcing function for abstraction — do not wait for a third.

### Copy-Paste Detection
If the only differences between two files are identifiers, names, or configuration values, the logic MUST be extracted into a shared component that accepts those values as parameters. Before creating a new module or feature file, diff it against the nearest equivalent. If the diff shows only namespace changes (e.g., `HCM` to `FIN`), string literal changes, or data differences — the logic is generic and must be shared.

### Configuration vs. Logic Separation
Module-specific files should contain only data (configuration, definitions, mappings). All behavioral logic (CRUD operations, navigation, service lookups, DOM manipulation, event handlers, fetch calls) must live in shared components. A module consists of:
- A config file (unique data)
- Data files (enums, columns, forms — unique per sub-module)
- An init file that calls a shared factory (~10 lines)

### Shared Components Before the Second Module
The shared abstraction layer must be created as part of building the first module, or at latest refactored out before the second module ships. Never ship a second module by copying the first. If the first module embedded behavioral logic, the second module's implementation must include extracting that logic into shared components.

### New Module Checklist
Before creating a new module, verify it only needs configuration files:
- Does it need its own navigation logic? -> No, use the shared navigation component.
- Does it need its own CRUD handlers? -> No, use the shared CRUD component.
- Does it need its own form wrapper? -> No, use the shared form framework.
- Does it need its own service lookup? -> No, use the shared service registry.
If any answer is "yes," fix the shared component -- do not work around it with a module-specific copy.

### Audit on Every Module Addition
When adding a new module, diff all existing module-level files. Any file with >80% similarity across modules is a refactoring candidate that MUST be addressed before the new module ships.

### Facades Are a Code Smell
If a wrapper file delegates 100% of its calls to another component, it should not exist. Delete it and reference the shared component directly. A file that only re-exports or proxies another component is dead weight.

### Backport Improvements Immediately
When a newer module improves on a pattern from an older module, the improvement must be backported to all existing modules immediately. Do not leave different implementations of the same logic across modules.

### Measure Boilerplate
If adding a new module requires more than 50 lines of structural/behavioral code (excluding domain-specific data like configs, enums, columns, forms), the shared abstraction layer needs improvement before proceeding.

### Document the Module Creation Recipe
Maintain a "How to Add a New Module" guide that specifies exactly which files to create and which shared components to use. If the guide says "copy an existing module," the architecture has failed. The guide should say: create config, create data files, create init file with a factory call. No copying. No behavioral code. Configuration only.

---

## 1.3 Plan Approval Workflow

**Source:** `plan-approval-workflow.md`

When a plan is created, it MUST be written to the `./plans` directory in the project root. Do NOT ask the user for approval directly -- the user needs to share the plan with their peers first. Wait for the user to explicitly confirm that the plan has been approved before implementing it.

### Process
1. Write the plan to `./plans/<descriptive-name>.md`
2. Inform the user that the plan is ready at that path
3. **Stop and wait** -- do not implement, do not ask "should I proceed?", do not call ExitPlanMode
4. Only begin implementation after the user explicitly says the plan is approved

---

# Part 2: Layer8 Architecture Rules

These rules are specific to the Layer8 ERP project architecture.

---

## 2.1 Core Architecture Rules

**Source:** `maintainability.md`

### Future-Proof Design
The ERP system has more modules that are not implemented yet. When designing components, consider that future modules (Financial, SCM, Manufacturing, Sales, CRM, Projects, BI, Documents, E-Commerce, Compliance, System) will follow similar patterns. Design shared components to be reusable across all modules.

### Demo Directory
The `/go/demo/` directory is auto-generated and used for local testing only. Do not edit code in that directory. The source of truth is `/go/erp/ui/web/`.

### ServiceName
ServiceName should not be larger than 10 characters.

### ServiceArea
ServiceArea should be the same for Services under the same Module.

### ServiceCallback Auto-Generate ID
Every `*ServiceCallback.go` must auto-generate the primary key ID on POST (Add) operations. In the `Before()` method, insert `common.GenerateID(&entity.PrimaryKeyField)` between the type assertion and the `validate()` call, guarded by `if action == ifs.POST`. The primary key field name is found in the corresponding `*Service.go` file's `SetPrimaryKeys("XxxId")` call. This ensures that Add operations from the UI (which don't include the primary key field in the form) succeed without "XxxId is required" errors.

### UI Type Registration
When creating a service, the model type must be registered in the UI. Add it to the appropriate `register<Module>Types` function in `go/erp/ui/main.go`. Follow the existing pattern: use `introspect.AddPrimaryKeyDecorator` to mark the primary key field, then call `registry.Register` with the type. If a `register<Module>Types` function doesn't exist for your module, create one following the pattern of `registerFinTypes` or `registerScmTypes`.

### Mobile Parity
**Source:** `mobile-parity.md`

Whenever implementing a UI feature, check if there is a mobile version and implement it as well.

---

## 2.2 UI Module Integration Checklist

**Source:** `ui-module-integration.md`

When implementing a new ERP module, the UI integration is NOT complete until ALL of the following files are created/updated. Do not mark the module as complete until this checklist is verified.

### Required Steps for Desktop UI

#### 1. Section HTML File
- **File**: `go/erp/ui/web/sections/<module>.html`
- Must contain the full module structure (NOT a placeholder)
- Must include: header with SVG illustration, module tabs, service navigation, table containers
- Use existing sections (crm.html, hcm.html) as templates

#### 2. Section Initializer
- **File**: `go/erp/ui/web/js/sections.js`
- Add module to `sectionInitializers` object:
  ```javascript
  <module>: () => {
      if (typeof initialize<Module> === 'function') {
          initialize<Module>();
      }
  },
  ```

#### 3. Module CSS
- **File**: `go/erp/ui/web/<module>/<module>.css`
- Include module-specific accent color for header and active states
- Include status/priority/type color classes as needed

#### 4. Reference Registry
- **File**: `go/erp/ui/web/js/reference-registry-<module>.js`
- Must be included in `app.html`

#### 5. app.html Updates
All of the following must be added to `go/erp/ui/web/app.html`:

**CSS Include** (in `<head>` section):
```html
<link rel="stylesheet" href="<module>/<module>.css">
```

**Reference Registry Include** (after other reference registries):
```html
<script src="js/reference-registry-<module>.js"></script>
```

**Module Scripts** (after other module scripts, before SYS Module):
```html
<!-- <MODULE> Module -->
<script src="<module>/<module>-config.js"></script>
<script src="<module>/<submodule1>/<submodule1>-enums.js"></script>
<script src="<module>/<submodule1>/<submodule1>-columns.js"></script>
<script src="<module>/<submodule1>/<submodule1>-forms.js"></script>
<!-- ... repeat for all submodules ... -->
<script src="<module>/<module>-init.js"></script>
```

### Verification Commands

```bash
# Check section HTML is not a placeholder
grep -l "under development" go/erp/ui/web/sections/<module>.html && echo "ERROR: Placeholder still present"

# Check section initializer exists
grep "<module>:" go/erp/ui/web/js/sections.js

# Check CSS is included in app.html
grep "<module>/<module>.css" go/erp/ui/web/app.html

# Check reference registry is included
grep "reference-registry-<module>.js" go/erp/ui/web/app.html

# Check module scripts are included
grep "<module>-init.js" go/erp/ui/web/app.html
```

### Common Mistake
Creating the submodule JS files (enums, columns, forms) but forgetting to:
- Update the section HTML from placeholder to actual content
- Add section initializer to sections.js
- Add script includes to app.html
- Create and include the CSS file

This results in the module appearing in navigation but showing "under development" or not functioning when clicked.

---

## 2.3 Module Init sectionSelector

**Source:** `module-init-section-selector.md`

In `*-init.js` files that use `Layer8DModuleFactory.create()`, the `sectionSelector` property MUST match the `defaultModule` property value.

### Why This Matters
The navigation code in `layer8d-module-navigation.js` searches for the section container using:
```javascript
document.querySelector(`.hcm-module-content[data-module="${config.sectionSelector}"]`)
```

The `data-module` attributes in the HTML correspond to submodule names (e.g., `planning`, `resources`, `opportunities`), NOT the section name (e.g., `projects`, `crm`).

If `sectionSelector` doesn't match any `data-module` attribute in the HTML, the module will fail to initialize with:
```
<Module> section container not found
```

### Correct Pattern
```javascript
// CORRECT - sectionSelector matches defaultModule
Layer8DModuleFactory.create({
    namespace: 'Prj',
    defaultModule: 'planning',        // <-- These must match
    defaultService: 'projects',
    sectionSelector: 'planning',      // <-- These must match
    initializerName: 'initializePrj',
    requiredNamespaces: [...]
});
```

### Examples from Existing Modules

| Module | defaultModule | sectionSelector |
|--------|---------------|-----------------|
| CRM    | opportunities | opportunities   |
| PRJ    | planning      | planning        |
| HCM    | core-hr       | core-hr         |
| FIN    | general-ledger| general-ledger  |

---

## 2.4 UI Endpoint Verification (CRITICAL)

**Source:** `maintainability.md`

When creating or updating UI module config files (`*-config.js`), you MUST verify every endpoint against the actual service definitions:
1. **Before writing any endpoint**, run: `grep "ServiceName = " /path/to/erp/<module>/*/*.go` to get ALL actual service names
2. **The endpoint in the config MUST exactly match** the `ServiceName` constant from the corresponding `*Service.go` file
3. **Never guess or abbreviate service names** -- always verify against the source of truth
4. **Common mistakes to avoid**:
   - Using `MfgWO` instead of `MfgWorkOrd`
   - Using `MfgQP` instead of `MfgQCPlan`
   - Abbreviating names differently than the service definition
5. **After creating a config file**, verify all endpoints by comparing against the grep output

This rule exists because mismatched endpoints cause 404 errors at runtime and are difficult to debug.

---

# Part 3: Protobuf & Type Rules

Rules for protobuf definitions and type mappings.

---

## 3.1 Protobuf Generation

**Source:** `protobuf-generation.md`

After creating the .proto files and updating the make-bindings.sh, execute the make-bindings.sh file to generate the protobuf bindings. The script places the .pb.go files in the correct directory at /go/types. This step is essential before other steps so there are no mistakes and issues.

### Process
1. **Create/Update .proto files** in `/proto/` directory
2. **Update make-bindings.sh** if new proto files were added
3. **Run make-bindings.sh** to generate Go bindings:
   ```bash
   cd /path/to/project/proto && ./make-bindings.sh
   ```
4. **Verify generation** by checking `/go/types/<module>/` for .pb.go files
5. **Build dependent code** to ensure types are correct before proceeding

### Common Issues

#### TTY Error
If running in a non-interactive shell and you see `the input device is not a TTY`:
```bash
sed 's/-it /-i /g' make-bindings.sh | bash
```

#### Field Name Verification
After generation, verify field names by checking the .pb.go files:
```bash
grep -A 30 "type TypeName struct" go/types/<module>/*.pb.go | grep 'json:"'
```

### Checklist Before Proceeding
- [ ] All .proto files created/updated
- [ ] make-bindings.sh updated with new proto files
- [ ] make-bindings.sh executed successfully
- [ ] .pb.go files exist in /go/types/<module>/
- [ ] Dependent code builds: `go build ./...`

---

## 3.2 Protobuf List Type Convention

**Source:** `proto-list-convention.md`

All protobuf list/collection message types must follow this exact pattern:

```protobuf
message SomeEntityList {
  repeated SomeEntity list = 1;
  l8api.L8MetaData metadata = 2;
}
```

### Key Points
- The repeated field MUST be named `list` (not `items`, `entries`, `data`, etc.)
- The `l8api.L8MetaData metadata` field MUST be included as field 2
- This pattern is required by the Layer8 framework for proper serialization and iteration

### Why This Matters
The Layer8 framework expects the `list` field name when iterating over collection types. Using a different field name (like `items`) will cause runtime errors such as:
```
invalid <TypeName> type
```

---

## 3.3 JavaScript Protobuf Field Name Mapping

**Source:** `js-protobuf-field-names.md`

JavaScript code must use the exact JSON field names from protobuf definitions. Protobuf field names use `snake_case` which converts to `camelCase` in JSON.

### Finding the Correct Field Name
Before using a field name in JavaScript:
1. Locate the protobuf type in `go/types/{module}/*.pb.go`
2. Find the field definition and look at the `json` tag
3. Use the JSON tag value (the part after `json:"` and before the comma)

### Common Naming Patterns
| Protobuf Field | JSON Name | Common Mistake |
|----------------|-----------|----------------|
| `warehouse_id` | `warehouseId` | `warehouseID` |
| `code` | `code` | `warehouseCode` |
| `is_active` | `isActive` | `active` |
| `audit_info` | `auditInfo` | `audit` |

### CRITICAL: "Number" Field Pitfall
Different models use different naming conventions for their number/identifier fields:

| Model | Correct Field | Common Mistake |
|-------|---------------|----------------|
| `MfgWorkOrder` | `workOrderNumber` | `orderNumber` |
| `MfgProductionOrder` | `orderNumber` | (correct) |
| `SalesOrder` | `orderNumber` | (correct) |
| `MfgBom` | `bomNumber` | `bomId` |
| `MfgRouting` | `routingNumber` | `routingId` |

**Always verify** by checking the protobuf definition:
```bash
grep -A15 "type MfgWorkOrder struct" go/types/mfg/*.pb.go | grep -E "Number|number"
```

### Quick Field Name Lookup
```bash
# List all fields for a type
grep -A 30 "type ScmWarehouse struct" go/types/scm/*.pb.go | grep 'json:"'
```

---

## 3.4 JavaScript UI Model Names Must Match Protobuf Types

**Source:** `js-protobuf-model-names.md`

JavaScript UI model names MUST exactly match the protobuf type names. Do not abbreviate, omit prefixes, or modify the names.

### Common Mistakes -- Module Prefix Omission
Protobuf types often have a module prefix (e.g., `Sales`, `Scm`, `Fin`). Never omit it:

| Wrong (JS) | Correct (JS) | Protobuf Type |
|------------|--------------|---------------|
| `ReturnOrder` | `SalesReturnOrder` | `SalesReturnOrder` |
| `CustomerHierarchy` | `SalesCustomerHierarchy` | `SalesCustomerHierarchy` |
| `PurchaseOrder` | `ScmPurchaseOrder` | `ScmPurchaseOrder` |
| `Warehouse` | `ScmWarehouse` | `ScmWarehouse` |

### Where Model Names Appear in JS
1. **Config files** (`*-config.js`): `model` property
2. **Form definitions** (`*-forms.js`): Object keys
3. **Column definitions** (`*-columns.js`): Object keys
4. **Primary key mappings**: Object keys
5. **Reference lookups** (`lookupModel` in forms): `lookupModel` value
6. **Navigation configs** (mobile/desktop nav): `model` property

### Verification Process
```bash
# Find all protobuf types for a module
grep "type Sales" go/types/sales/*.pb.go | grep "struct {"

# List all type names
grep -oP "type \K\w+" go/types/sales/*.pb.go | grep -v "^is" | sort -u
```

### Error Symptom
```
(Error) - Cannot find node for table ReturnOrder
```
This means JS sent `ReturnOrder` but the protobuf type is `SalesReturnOrder`.

---

# Part 4: JavaScript UI Rules

Rules for JavaScript form fields, columns, and reference registries.

---

## 4.1 JS Column and Form Field Name Verification

**Source:** `js-column-field-verification.md`

Every field name used in JavaScript column definitions (`*-columns.js`) and form definitions (`*-forms.js`) MUST be verified against the protobuf JSON field name before use. Never guess, assume, or invent field names. This applies to ALL JS code that references data model fields.

### Root Cause
During refactoring, field names were written from memory or guessed instead of being verified against the protobuf `.pb.go` files. This introduced ~450 silent field name mismatches across 9 modules, causing empty table cells throughout the UI. The data existed on the server but was invisible because JS accessed non-existent properties.

### MANDATORY: Protobuf-First Workflow
When writing or refactoring ANY JS file that references data model fields:

1. **BEFORE writing any field name**, read the protobuf struct:
   ```bash
   grep -A 40 "type ModelName struct" go/types/<module>/*.pb.go
   ```

2. Extract the protobuf JSON field name from the `protobuf` tag (`json=camelCaseName`).

3. **ONLY use field names that exist in the protobuf struct.** Never invent fields.

4. **After writing**, verify every field name in the file against the protobuf struct.

### Common Mismatch Categories
| Category | Example Wrong | Example Correct |
|---|---|---|
| Singular vs Plural | `projectedInflow` | `projectedInflows` |
| Abbreviated | `allocatedQty` | `allocatedQuantity` |
| Missing prefix | `reason` | `reasonCode` |
| Fabricated field | `salePrice` | `disposalProceeds` |
| Timestamp convention | `signedAt` | `signedDate` |
| Wrong prefix | `fromDepartment` | `fromDepartmentId` |
| Semantic guess | `oldValue` | `previousValue` |

### Error Symptom
Table rows appear but specific columns are empty (no data, no error). The failure is completely silent -- no console errors are produced.

### This Rule Is Non-Negotiable
The cost of checking is seconds; the cost of not checking is hundreds of broken columns across the UI.

---

## 4.2 Nested Protobuf Types in Form Definitions

**Source:** `money-field-type-mapping.md`

Before using any form factory method (`f.text()`, `f.number()`, etc.) for a field, you MUST check its protobuf type. If the protobuf type is a nested object (pointer to another struct like `*erp.Something`), a repeated field (`[]string`, `[]*Type`), or a map (`map[string]string`), you CANNOT use scalar form methods like `f.text()`, `f.number()`, or `f.textarea()`. These will display `[object Object]` because JavaScript stringifies the nested object.

### How to Check
```bash
# Look up the actual protobuf type for any field
grep -A 30 "type ModelName struct" go/types/<module>/*.pb.go
```

If a field's Go type starts with `*`, `[]`, or `map[`, it is NOT a simple scalar -- it requires special handling.

### What to Do
- If a form factory method already exists for that type -> use it
- If NO form factory method exists -> create one first
- **Never work around it by using f.text() or f.textarea()** -- will display `[object Object]`

### Current Type Mappings

| Go Type Pattern | Form Factory | Why |
|----------------|-------------|-----|
| `string`, `int32`, `int64`, `float64`, `bool` | `f.text()`, `f.number()`, `f.checkbox()` | Simple scalars -- safe |
| `*erp.Money` | `f.money()` | Nested `{amount, currencyCode}` |
| `*erp.Address` | `...f.address('prefix')` | Expands to 6 address fields |
| `*erp.ContactInfo` | `...f.contact('prefix')` | Expands to email + phone |
| `*erp.DateRange` | Two `f.date('parent.startDate/endDate')` | Two timestamps in nested object |
| `*erp.AuditInfo` | `...f.audit()` | Read-only metadata |
| `[]string` | `f.text()` (temporary) | Displays comma-separated; needs future `f.tags()` |
| Any new `*erp.X` | **Create handler first** | Never use scalar fallback |

### Error Symptoms
- `[object Object]` in form field -> nested type using scalar form method
- Field empty on edit but table shows data -> dot-notation key not resolving
- Save corrupts data -> form sends scalar but server expects nested object

---

## 4.3 Compound Form Field Data Collection

**Source:** `compound-form-field-data-collection.md`

When a form field type renders **multiple sub-elements** with modified names (e.g., `fieldKey.__amount`, `fieldKey.__currencyId`), the data collection code MUST NOT rely on `form.elements[field.key]` to find the element -- it won't exist.

### Why This Matters
The standard data collection pattern is:
```javascript
const element = form.elements[field.key];
if (!element) return;  // <- Skips the ENTIRE field silently!
```

For compound fields (like `type: 'money'`), no single element has `name="fieldKey"`. The sub-elements have names like `fieldKey.__amount` and `fieldKey.__currencyId`. The guard silently skips data collection, the server receives no value, and required validation fails with a cryptic error.

### The Trap
This bug is **silent** -- no console error, no visible failure during form rendering. The form looks correct, the user fills in values, but on save the server rejects with "Field is required" because the data was never collected.

### Checklist for Compound Field Types
When adding a new compound field type (a field that renders multiple sub-inputs):

1. **Rendering**: Sub-elements use `name="${field.key}.__subField"` convention
2. **Data collection guard**: Add the field type to the guard exception:
   ```javascript
   if (!element && field.type !== 'money' && field.type !== 'newCompoundType') return;
   ```
3. **Data collection case**: Use `form.elements[field.key + '.__subField']` or `form.querySelector()` to find sub-elements directly
4. **Test manually**: After implementing, verify that saving a form with the compound field actually sends the data to the server

### Current Compound Field Types
- `money` -- renders `fieldKey.__currencyId` (`<select>`) + `fieldKey.__amount` (formatted input)

### Desktop vs Mobile
- **Desktop** (`layer8d-forms-data.js`): Uses `form.elements[field.key]` lookup -- VULNERABLE to this bug
- **Mobile** (`layer8m-forms.js`): Iterates all `input, select, textarea` elements by name -- NOT vulnerable

---

## 4.4 Reference Registry Completeness

**Source:** `reference-registry-completeness.md`

Every model used as a `lookupModel` in form definitions MUST have a corresponding entry in the reference registry. Forms with unregistered lookupModels will fail silently or show console warnings.

### Before Adding a Reference Field
```bash
grep -r "Customer:" go/erp/ui/web/js/reference-registry-*.js
```

### Reference Registry Entry Requirements
Each entry must have:
- `idColumn`: The primary key field name (from protobuf)
- `displayColumn`: Field to show in the picker
- `selectColumns`: Fields to fetch for display
- `displayLabel`: Human-readable name (optional but recommended)
- `displayFormat`: Custom format function (optional, for complex displays)

### Common Patterns

```javascript
const ref = window.Layer8RefFactory;
window.MyRegistry = {
    ...ref.simple('ModelName', 'primaryKeyId', 'displayField', 'Label'),
    ...ref.coded('ModelName', 'primaryKeyId', 'code', 'name'),
    ...ref.person('ModelName', 'primaryKeyId'),
    ...ref.idOnly('ModelName', 'primaryKeyId'),
};
```

### Checklist for New Modules
- [ ] Create `reference-registry-<module>.js` for desktop
- [ ] Create `layer8m-reference-registry-<module>.js` for mobile
- [ ] Add script includes to `app.html` and `m/app.html`
- [ ] Register all models that will be used as lookupModel
- [ ] Run verification command to confirm no missing registrations

### Error Symptom
```
Reference input missing required config: fieldName
```
This console warning means the lookupModel for that field is not in the reference registry.

---

# Part 5: Mock Data Rules

Rules for mock data generation and testing.

---

## 5.1 Mock Data Generation for New ERP Modules

**Source:** `mock-data-generation.md`

### Location
All mock data files live in `go/tests/mocks/`. The system generates phased, dependency-ordered mock data with realistic ("flavorable") distributions.

### Prerequisites
- Module protobuf types exist in `go/types/<module>/`
- Module service area number is known (HCM=10, FIN=40, SCM=50)

### Step-by-Step Process

#### Step 1: Read the new module's protobuf files
- Identify all structs (models), their exact field names/types, and enums
- Note cross-module references (fields pointing to HCM employees, FIN vendors, etc.)
- Pay close attention to actual field names -- they often differ from what you'd guess

#### Step 2: Determine phase ordering
- Group models by dependency: foundation objects first, then objects that reference them
- Typically 5-10 phases per module
- Foundation (no deps) -> Core entities -> Dependent objects -> Transactions -> Planning/Analytics

#### Step 3: Add module data arrays to `data.go`
- Curated name arrays for realistic variety
- Place after existing module data with a comment header

#### Step 4: Add ID slices to `store.go`
- One `[]string` per model in the `MockDataStore` struct, grouped by phase with comments
- Use module prefix for names that could collide

#### Step 5: Create generator files (parallelizable)
- One file per logical group (e.g., `gen_<module>_foundation.go`)
- Each file must stay under 500 lines
- Signature: `func generate<Models>(store *MockDataStore) []*<module>.<Model>`
- Patterns: flavorable distributions, `createAuditInfo()`, `&erp.Money{...}`, modulo indexing for refs
- ID format: `fmt.Sprintf("<prefix>-%03d", i+1)`

#### Step 6: Create phase orchestration files
- Each phase: calls generator, posts to endpoint, appends IDs, prints count
- ServiceName must be 10 characters or less

#### Step 7: Update `main.go`
- Add phase calls after existing modules

#### Step 8: Build and verify
- `go build ./tests/mocks/` and `go vet ./tests/mocks/`

### Key Patterns

#### Cross-module references
- HCM: `EmployeeIDs`, `ManagerIDs`, `DepartmentIDs`
- FIN: `VendorIDs`, `CustomerIDs`
- Always check `len(store.*IDs) > 0` before accessing when the dependency is optional

#### File naming convention
- Generator files: `gen_<module>_<group>.go`
- Phase files: `<module>_phases.go`, `<module>_phases<N>_<M>.go`

---

## 5.2 Mock Data Completeness

**Source:** `mock-completeness.md`

When implementing mock data generators for a module, ALL services in that module MUST have corresponding mock data generators. No service should be left without mock data.

### Verification Process

#### Before Implementation
1. List all services: `ls -la go/erp/<module>/`
2. Cross-reference with UI config: `go/erp/ui/web/<module>/<module>-config.js`

#### After Implementation
1. Verify store.go has ID slices: `grep "<Module>.*IDs" go/tests/mocks/store.go`
2. Verify all generators exist: `grep "func generate<Module>" go/tests/mocks/gen_<module>*.go`
3. Verify all phase calls: `grep "client.post.*/<serviceArea>/" go/tests/mocks/<module>_phases*.go`
4. Count services vs generators (should match)

### Common Patterns That Lead to Missing Generators

#### Line Items
When a parent entity has line items, both need generators:
- SalesOrder -> SalesOrderLine
- SalesReturnOrder -> SalesReturnOrderLine (often missed!)

#### Secondary/Support Entities
Often overlooked: Allocations, Back orders, Confirmations, Break tables

#### Junction/Assignment Tables
- TerritoryAssign, EmployeeSkill, CourseEnrollment

### Checklist Before PR
- [ ] All services in `go/erp/<module>/` have generators
- [ ] All services in UI config have generators
- [ ] store.go has ID slices for all entities
- [ ] All generators are called in phase files
- [ ] Build passes: `go build ./tests/mocks/`
- [ ] Vet passes: `go vet ./tests/mocks/`

---

## 5.3 Mock Endpoint Construction

**Source:** `mock-endpoint-construction.md`

### Endpoint Format
```
/erp/{ServiceArea}/{ServiceName}
```

### Finding the Correct ServiceName
The `ServiceName` constant is defined in each service's `*Service.go` file. Before writing a mock endpoint:
1. Locate the service file: `go/erp/{module}/{servicedir}/*Service.go`
2. Find the `ServiceName` constant (typically around line 30)
3. Use that exact value in the endpoint

### Example
```go
// In go/erp/sales/salesterritories/SalesTerritoryService.go
const (
    ServiceName = "Territory"  // <-- Use this value
    ServiceArea = byte(60)
)
```

Mock endpoint: `/erp/60/Territory` (NOT `/erp/60/SalesTerritory`)

### ServiceName Constraint
ServiceName must be 10 characters or less. This is why names are abbreviated:
- `Territory` not `SalesTerritory`
- `DlvryOrder` not `DeliveryOrder`
- `CustSegmt` not `CustomerSegment`

### Verification Checklist
```bash
grep "ServiceName = " go/erp/{module}/**/*Service.go
```

---

## 5.4 Mock Phase Ordering: Cross-Module Dependencies

**Source:** `mock-phase-ordering.md`

When adding server-side validation (e.g., `ValidateRequired`) for a foreign key field, you MUST verify that the mock data phase ordering ensures the referenced entity's IDs are populated BEFORE any generator that uses them.

### The `pickRef` Trap
```go
func pickRef(ids []string, index int) string {
    if len(ids) == 0 {
        return ""  // <- Silent empty string, not an error!
    }
    return ids[index%len(ids)]
}
```

`pickRef` does NOT panic or warn when the slice is empty. It silently returns an empty string, which passes Go compilation but fails server validation at runtime.

### Current Module Phase Order (in `main_phases.go`)

```
1. FIN Foundation (Phases 1-3) -- CurrencyIDs, FiscalYearIDs, Accounts, Vendors, Customers
2. HCM (all phases)            -- EmployeeIDs, DepartmentIDs (needs CurrencyIDs)
3. FIN Remaining (Phases 4-9)  -- Budgets, AP, AR, GL, Assets, Tax (needs DepartmentIDs, EmployeeIDs)
4. SCM
5. Sales
6. MFG
7. CRM
8. PRJ
9. BI
10. DOC
11. ECOM
12. COMP
```

### Why FIN is Split
- FIN Phases 1-3: No HCM dependency. Provides CurrencyIDs needed by ALL modules.
- FIN Phase 4: Uses `store.DepartmentIDs` for Budgets.
- FIN Phase 8: Uses `store.EmployeeIDs` and `store.DepartmentIDs`.
- HCM: Uses `store.CurrencyIDs` in compensation, payroll, benefits, employee data.

### Common Cross-Module Dependencies
| Field | Source Module | Source Phase | Used By |
|-------|-------------|-------------|---------|
| CurrencyIDs | FIN | Phase 1 | ALL modules |
| EmployeeIDs | HCM | Phase 1-3 | FIN 8, CRM, PRJ, MFG, Sales |
| DepartmentIDs | HCM | Phase 1 | FIN 4+8, PRJ, MFG |
| VendorIDs | FIN | Phase 2 | SCM, MFG |
| CustomerIDs | FIN | Phase 2 | Sales, ECOM, CRM |
| ItemIDs | SCM | Phase 1 | Sales, MFG, ECOM |

### Checklist When Adding Required Validation
Before adding `common.ValidateRequired(entity.SomeId, "SomeId")`:
1. **Identify which module generates the referenced IDs**
2. **Check `main_phases.go`** to confirm that module runs BEFORE
3. **Check mock generators** -- verify they set the field using `pickRef(store.XxxIDs, ...)`
4. **If the referenced module runs AFTER**, either reorder or add a bootstrap phase
