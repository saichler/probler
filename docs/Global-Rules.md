# Global Rules

This document contains all global Claude rules for ERP development.

---

## Table of Contents

1. [UI Module Integration Checklist](#ui-module-integration-checklist)
2. [Mock Data Completeness](#mock-data-completeness)
3. [Mock Data Generation](#mock-data-generation)
4. [JavaScript Protobuf Field Name Mapping](#javascript-protobuf-field-name-mapping)
5. [Mobile Parity](#mobile-parity)
6. [Mock Endpoint Construction](#mock-endpoint-construction)
7. [Module Init sectionSelector Must Match defaultModule](#module-init-sectionselector-must-match-defaultmodule)
8. [Protobuf Generation](#protobuf-generation)
9. [JavaScript UI Model Names Must Match Protobuf Types](#javascript-ui-model-names-must-match-protobuf-types)
10. [Code Maintainability Standards](#code-maintainability-standards)

---

## UI Module Integration Checklist

### Rule
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

##### CSS Include (in `<head>` section)
```html
<link rel="stylesheet" href="<module>/<module>.css">
```

##### Reference Registry Include (after other reference registries)
```html
<script src="js/reference-registry-<module>.js"></script>
```

##### Module Scripts (after other module scripts, before SYS Module)
```html
<!-- <MODULE> Module -->
<script src="<module>/<module>-config.js"></script>
<script src="<module>/<submodule1>/<submodule1>-enums.js"></script>
<script src="<module>/<submodule1>/<submodule1>-columns.js"></script>
<script src="<module>/<submodule1>/<submodule1>-forms.js"></script>
<script src="<module>/<submodule1>/<submodule1>.js"></script>
<!-- ... repeat for all submodules ... -->
<script src="<module>/<module>-init.js"></script>
```

### Verification Commands

After implementation, verify with:
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

## Mock Data Completeness

### Rule
When implementing mock data generators for a module, ALL services in that module MUST have corresponding mock data generators. No service should be left without mock data.

### Why This Matters
Incomplete mock data causes confusion during testing and development. Users see some tables populated and others empty, leading to debugging sessions to figure out if it's a bug or missing mock data.

### Verification Process

#### Before Implementation
1. **List all services in the module**:
   ```bash
   ls -la go/erp/<module>/
   ```

2. **Extract service names from the directories**:
   Each subdirectory represents a service that needs mock data.

3. **Cross-reference with UI config**:
   Check `go/erp/ui/web/<module>/<module>-config.js` to see all services defined in the UI.

#### During Implementation
Create a checklist of all services and mark them as you implement:

```
Module: Sales (33 services)
- [ ] customerhierarchies
- [ ] customersegments
- [ ] customercontracts
- [ ] partnerchannels
- [ ] pricelists
- [ ] pricelistentries
- [ ] customerprices
- [ ] discountrules
- [ ] promotionalprices
- [ ] quantitybreaks        <-- Easy to miss!
- [ ] salesquotations
- [ ] quotationlines
- [ ] salesorders
- [ ] salesorderlines
- [ ] orderallocations      <-- Easy to miss!
- [ ] backorders            <-- Easy to miss!
- [ ] returnorders
- [ ] returnorderlines      <-- Easy to miss!
- [ ] deliveryorders
- [ ] deliverylines
- [ ] pickreleases
- [ ] packingslips
- [ ] shippingdocs
- [ ] deliveryconfirms      <-- Easy to miss!
- [ ] billingschedules
- [ ] billingmilestones
- [ ] revenueschedules
- [ ] salesterritories
- [ ] territoryassigns
- [ ] commissionplans
- [ ] commissioncalcs
- [ ] salestargets
- [ ] salesforecasts
```

#### After Implementation
1. **Verify store.go has ID slices for all entities**:
   ```bash
   grep "<Module>.*IDs" go/tests/mocks/store.go
   ```

2. **Verify all generators exist**:
   ```bash
   grep "func generate<Module>" go/tests/mocks/gen_<module>*.go
   ```

3. **Verify all phase calls exist**:
   ```bash
   grep "client.post.*/<serviceArea>/" go/tests/mocks/<module>_phases*.go
   ```

4. **Count services vs generators**:
   ```bash
   # Count services
   ls -d go/erp/<module>/*/ | wc -l

   # Count generators (should match)
   grep -c "func generate<Module>" go/tests/mocks/gen_<module>*.go
   ```

### Common Patterns That Lead to Missing Generators

#### 1. Line Items
When a parent entity has line items, both need generators:
- SalesOrder -> SalesOrderLine
- SalesReturnOrder -> SalesReturnOrderLine (often missed!)
- SalesQuotation -> SalesQuotationLine

#### 2. Secondary/Support Entities
These are often overlooked:
- Allocations (OrderAllocation, InventoryAllocation)
- Back orders
- Confirmations (DeliveryConfirm, ReceivingConfirm)
- Break tables (QuantityBreak, PriceBreak)

#### 3. Junction/Assignment Tables
- TerritoryAssign
- EmployeeSkill
- CourseEnrollment

### Generator File Organization

Organize generators by functional area to make completeness easier to verify:

```
gen_<module>_foundation.go    - Base/master data
gen_<module>_<area1>.go       - First functional area
gen_<module>_<area2>.go       - Second functional area
...
```

Each file should have a comment header listing what it generates:

```go
// gen_sales_orders.go
// Generates:
// - SalesQuotation
// - SalesQuotationLine
// - SalesOrder
// - SalesOrderLine
// - SalesOrderAllocation
// - SalesBackOrder
// - SalesReturnOrder
// - SalesReturnOrderLine
```

### Phase Organization

Group related entities in the same phase for dependency management:

```
Phase 1: Foundation (no dependencies)
Phase 2: Core entities (depend on foundation)
Phase 3: Configuration (depend on core)
Phase 4: Transactions (depend on configuration)
Phase 5: Line items (depend on transactions)
Phase 6+: Additional areas
```

### Checklist Before PR

- [ ] All services in `go/erp/<module>/` have generators
- [ ] All services in UI config have generators
- [ ] store.go has ID slices for all entities
- [ ] All generators are called in phase files
- [ ] Build passes: `go build ./tests/mocks/`
- [ ] Vet passes: `go vet ./tests/mocks/`

---

## Mock Data Generation

### Location
All mock data files live in `go/tests/mocks/`. The system generates phased, dependency-ordered mock data with realistic ("flavorable") distributions.

### Prerequisites
- Module protobuf types exist in `go/types/<module>/`
- Module service area number is known (HCM=10, FIN=40, SCM=50)

### Step-by-Step Process

#### Step 1: Read the new module's protobuf files
- Identify all structs (models), their exact field names/types, and enums
- Note cross-module references (fields pointing to HCM employees, FIN vendors, etc.)
- Pay close attention to actual field names - they often differ from what you'd guess (e.g., `RmaId` not `AuthorizationId`)

#### Step 2: Determine phase ordering
- Group models by dependency: foundation objects first, then objects that reference them
- Typically 5-10 phases per module
- Foundation (no deps) -> Core entities -> Dependent objects -> Transactions -> Planning/Analytics

#### Step 3: Add module data arrays to `data.go`
- Curated name arrays for realistic variety (category names, entity names, etc.)
- Place after existing module data with a comment header

#### Step 4: Add ID slices to `store.go`
- One `[]string` per model in the `MockDataStore` struct, grouped by phase with comments
- Use module prefix for names that could collide with other modules (e.g., `SCMWarehouseIDs`, `SCMCarrierIDs`)

#### Step 5: Create generator files (parallelizable)
- One file per logical group (e.g., `gen_<module>_foundation.go`, `gen_<module>_inventory.go`)
- Each file must stay under 500 lines
- Each function signature: `func generate<Models>(store *MockDataStore) []*<module>.<Model>`
  - Foundation generators with no store deps use: `func generate<Models>() []*<module>.<Model>`
- Patterns to follow:
  - Allocate slice, loop with flavorable distributions (e.g., 60% APPROVED status)
  - `createAuditInfo()` for all audit fields
  - `&erp.Money{Amount: <cents>, CurrencyCode: "USD"}` for monetary fields
  - `time.Unix()` / `.Unix()` for date fields
  - `&erp.DateRange{StartDate: ..., EndDate: ...}` for date ranges
  - Reference `store.*IDs` with modulo indexing for cross-model/cross-module links
  - ID format: `fmt.Sprintf("<prefix>-%03d", i+1)`
- These files can all be created in parallel since they have no interdependencies

#### Step 6: Create phase orchestration files
- `<module>_phases.go` (and `<module>_phases<N>_<M>.go` if needed to stay under 500 lines)
- Each phase function:
  1. Calls the generator function
  2. Posts to `/erp/<serviceArea>/<ServiceName>` using `client.post()` with the `*List` wrapper type
  3. Appends returned IDs to `store.*IDs`
  4. Prints count
- ServiceName must be 10 characters or less

#### Step 7: Update `main.go`
- Add phase calls after existing modules (with Printf headers)
- Add summary Printf section at the end showing key entity counts

#### Step 8: Build and verify
- `go build ./tests/mocks/` and `go vet ./tests/mocks/`
- Most common error: proto field names differ from expectations - always verify against the `.pb.go` files

### Key Patterns

#### Flavorable distributions
- Use proportional status assignment: e.g., first 60% get APPROVED, next 20% get IN_PROGRESS, rest cycle through remaining statuses
- Random but bounded values: `rand.Intn(max-min) + min`
- Money amounts in cents: `int64(rand.Intn(rangeSize) + minimum)`

#### Cross-module references
- HCM: `EmployeeIDs`, `ManagerIDs`, `DepartmentIDs` (for managers, requesters, assignees)
- FIN: `VendorIDs` (for procurement, suppliers), `CustomerIDs` (for shipments, returns)
- Always check `len(store.*IDs) > 0` before accessing when the dependency is optional

#### File naming convention
- Generator files: `gen_<module>_<group>.go`
- Phase files: `<module>_phases.go`, `<module>_phases<N>_<M>.go`

---

## JavaScript Protobuf Field Name Mapping

### Field Name Format
JavaScript code must use the exact JSON field names from protobuf definitions. Protobuf field names use `snake_case` which converts to `camelCase` in JSON.

### Finding the Correct Field Name
Before using a field name in JavaScript (reference registries, column definitions, forms, etc.):

1. Locate the protobuf type in `go/types/{module}/*.pb.go`
2. Find the field definition and look at the `json` tag
3. Use the JSON tag value (the part after `json:"` and before the comma)

### Example
For ScmWarehouse:
```go
// In go/types/scm/scm-warehouse.pb.go
type ScmWarehouse struct {
    WarehouseId string `protobuf:"..." json:"warehouseId,omitempty"`
    Code        string `protobuf:"..." json:"code,omitempty"`        // <-- JSON name is "code"
    Name        string `protobuf:"..." json:"name,omitempty"`
    ...
}
```

JavaScript should use:
```javascript
selectColumns: ['warehouseId', 'code', 'name'],  // Correct
displayFormat: function(item) {
    return item.code + ' - ' + item.name;        // Correct
}
```

**NOT** `warehouseCode` (incorrect - field doesn't exist)

### Common Naming Patterns
| Protobuf Field | JSON Name | Common Mistake |
|----------------|-----------|----------------|
| `warehouse_id` | `warehouseId` | `warehouseID` |
| `code` | `code` | `warehouseCode` |
| `is_active` | `isActive` | `active` |
| `audit_info` | `auditInfo` | `audit` |

### Verification Steps
Before adding field references in JavaScript:
1. Search the .pb.go file: `grep -A 20 "type TypeName struct" go/types/{module}/*.pb.go`
2. List all JSON field names from the struct
3. Use exact matches in JavaScript code

### Files That Reference Field Names
- `erp/ui/web/js/reference-registry-*.js` - Reference lookups
- `erp/ui/web/l8ui/m/js/layer8m-reference-registry.js` - Mobile reference lookups
- `erp/ui/web/{module}/js/*-columns.js` - Table column definitions
- `erp/ui/web/{module}/js/*-form.js` - Form field definitions

### Quick Field Name Lookup
```bash
# List all fields for a type
grep -A 30 "type ScmWarehouse struct" go/types/scm/*.pb.go | grep 'json:"'
```

---

## Mobile Parity

Whenever implementing a UI feature, check if there is a mobile version and implement it as well.

---

## Mock Endpoint Construction

### Endpoint Format
Mock endpoints must follow this exact format:
```
/erp/{ServiceArea}/{ServiceName}
```

### Finding the Correct ServiceName
The `ServiceName` constant is defined in each service's `*Service.go` file. Before writing a mock endpoint:

1. Locate the service file: `go/erp/{module}/{servicedir}/*Service.go`
2. Find the `ServiceName` constant (typically around line 30)
3. Use that exact value in the endpoint

### Example
For Sales Territory service:
```go
// In go/erp/sales/salesterritories/SalesTerritoryService.go
const (
    ServiceName = "Territory"  // <-- Use this value
    ServiceArea = byte(60)
)
```

Mock endpoint should be:
```go
client.post("/erp/60/Territory", &sales.SalesTerritoryList{...})
```

**NOT** `/erp/60/SalesTerritory` (incorrect - doesn't match ServiceName)

### ServiceName Constraint
ServiceName must be 10 characters or less (per maintainability.md). This is why names are abbreviated:
- `Territory` not `SalesTerritory`
- `DlvryOrder` not `DeliveryOrder`
- `CustSegmt` not `CustomerSegment`

### Verification Checklist
Before creating mock phase files:
1. Run: `grep "ServiceName = " go/erp/{module}/**/*Service.go` to list all service names
2. Cross-reference each mock endpoint against the grep output
3. Ensure exact match between endpoint path segment and ServiceName constant

### Common Mistakes to Avoid
- Using the type name (e.g., `SalesTerritory`) instead of ServiceName (`Territory`)
- Guessing abbreviated names instead of checking the actual constant
- Forgetting that ServiceName has a 10-character limit

---

## Module Init sectionSelector Must Match defaultModule

### Rule
In `*-init.js` files that use `Layer8DModuleFactory.create()`, the `sectionSelector` property MUST match the `defaultModule` property value.

### Why This Matters
The navigation code in `layer8d-module-navigation.js` searches for the section container using:
```javascript
document.querySelector(`.hcm-module-content[data-module="${config.sectionSelector}"]`)
```

The `data-module` attributes in the HTML correspond to submodule names (e.g., `planning`, `resources`, `opportunities`), NOT the section name (e.g., `projects`, `crm`).

If `sectionSelector` doesn't match any `data-module` attribute in the HTML, the module will fail to initialize with the error:
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

```javascript
// WRONG - sectionSelector uses section name instead of module name
Layer8DModuleFactory.create({
    namespace: 'Prj',
    defaultModule: 'planning',
    defaultService: 'projects',
    sectionSelector: 'projects',      // <-- WRONG: 'projects' is the section, not the module
    initializerName: 'initializePrj',
    requiredNamespaces: [...]
});
```

### Verification
When creating a module init file, verify:
1. `sectionSelector` === `defaultModule`
2. The HTML has `<div class="hcm-module-content" data-module="${sectionSelector}">`

### Examples from Existing Modules

| Module | defaultModule | sectionSelector |
|--------|---------------|-----------------|
| CRM    | opportunities | opportunities   |
| PRJ    | planning      | planning        |
| HCM    | core-hr       | core-hr         |
| FIN    | general-ledger| general-ledger  |

---

## Protobuf Generation

### Rule
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

### Why This Matters
- Generated .pb.go files contain the actual Go struct definitions
- Field names in generated code may differ from what you expect
- Building code that uses these types before generation will fail
- Mock data generators, services, and UI code all depend on these types

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

## JavaScript UI Model Names Must Match Protobuf Types

### Rule
JavaScript UI model names MUST exactly match the protobuf type names. Do not abbreviate, omit prefixes, or modify the names.

### Why This Matters
The server uses protobuf type names to look up table schemas. If the JavaScript UI sends a different model name, the server returns "Cannot find node for table X" errors.

### Common Mistakes

#### Module Prefix Omission
Protobuf types often have a module prefix (e.g., `Sales`, `Scm`, `Fin`). Never omit it:

| Wrong (JS) | Correct (JS) | Protobuf Type |
|------------|--------------|---------------|
| `ReturnOrder` | `SalesReturnOrder` | `SalesReturnOrder` |
| `CustomerHierarchy` | `SalesCustomerHierarchy` | `SalesCustomerHierarchy` |
| `PurchaseOrder` | `ScmPurchaseOrder` | `ScmPurchaseOrder` |
| `Warehouse` | `ScmWarehouse` | `ScmWarehouse` |

#### Where Model Names Appear in JS

1. **Config files** (`*-config.js`):
   ```javascript
   { key: 'returns', label: 'Returns', model: 'SalesReturnOrder' }  // Correct
   { key: 'returns', label: 'Returns', model: 'ReturnOrder' }       // WRONG
   ```

2. **Form definitions** (`*-forms.js`):
   ```javascript
   SalesOrders.forms = {
       SalesReturnOrder: { ... }  // Correct - key must match protobuf type
       ReturnOrder: { ... }       // WRONG
   }
   ```

3. **Column definitions** (`*-columns.js`):
   ```javascript
   SalesOrders.columns = {
       SalesReturnOrder: [ ... ]  // Correct
       ReturnOrder: [ ... ]       // WRONG
   }
   ```

4. **Primary key mappings**:
   ```javascript
   SalesOrders.primaryKeys = {
       SalesReturnOrder: 'returnOrderId'  // Correct
       ReturnOrder: 'returnOrderId'       // WRONG
   }
   ```

5. **Reference lookups** (`lookupModel` in forms):
   ```javascript
   { key: 'warehouseId', type: 'reference', lookupModel: 'ScmWarehouse' }  // Correct
   { key: 'warehouseId', type: 'reference', lookupModel: 'Warehouse' }     // WRONG
   ```

6. **Navigation configs** (mobile/desktop nav):
   ```javascript
   { model: 'SalesReturnOrder' }  // Correct
   { model: 'ReturnOrder' }       // WRONG
   ```

### Verification Process

Before implementing UI for a module:

1. **Find the protobuf types**:
   ```bash
   grep "type Sales" go/types/sales/*.pb.go | grep "struct {"
   ```

2. **List all type names**:
   ```bash
   grep -oP "type \K\w+" go/types/sales/*.pb.go | grep -v "^is" | sort -u
   ```

3. **Use exact names** from the protobuf output in all JavaScript files.

### Error Symptom
```
(Error) - Cannot find node for table ReturnOrder
```
This means JS sent `ReturnOrder` but the protobuf type is `SalesReturnOrder`.

### Files to Check When Adding a Module

- `*-config.js` - service definitions with `model` property
- `*-forms.js` - form definition keys and `lookupModel` references
- `*-columns.js` - column definition keys
- `*-renderers.js` - any model references
- `layer8m-nav-config.js` - mobile navigation model references
- `reference-registry*.js` - reference registry keys

---

## Code Maintainability Standards

### File Size
Files that are over 500 lines of code are not maintainable, please make sure to refactor them and break them into smaller files logically.

### No Duplicate Code
Avoid duplicate code. Always check for existing utilities, functions, or components before writing new code. Consolidate duplicates into shared modules.

### Future-Proof Design
The ERP system has more modules that are not implemented yet. When designing components, consider that future modules (Financial, SCM, Manufacturing, Sales, CRM, Projects, BI, Documents, E-Commerce, Compliance, System) will follow similar patterns. Design shared components to be reusable across all modules.

### Read Before Implementing
When asked to implement something similar to an existing component, you MUST read ALL the code of the referenced component(s) first. Do not make any assumptions. Read every file, understand every pattern, and only then implement following the exact same patterns.
- Use the Read tool to read the file completely. Show the key interfaces and props found. Then implement.

### Component Integration Analysis
When implementing support for a component, perform deep analysis first:
- Understand all initialization arguments and configuration options
- Understand how endpoints are constructed (if applicable)
- Understand how L8Query is constructed for paging, filtering, and sorting (if supported)
- Only proceed with implementation after full understanding is documented

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

### UI Endpoint Verification (CRITICAL)
When creating or updating UI module config files (`*-config.js`), you MUST verify every endpoint against the actual service definitions:
1. **Before writing any endpoint**, run: `grep "ServiceName = " /path/to/erp/<module>/*/*.go` to get ALL actual service names
2. **The endpoint in the config MUST exactly match** the `ServiceName` constant from the corresponding `*Service.go` file
3. **Never guess or abbreviate service names** - always verify against the source of truth
4. **Common mistakes to avoid**:
   - Using `MfgWO` instead of `MfgWorkOrd`
   - Using `MfgQP` instead of `MfgQCPlan`
   - Abbreviating names differently than the service definition
5. **After creating a config file**, verify all endpoints by comparing against the grep output

This rule exists because mismatched endpoints cause 404 errors at runtime and are difficult to debug. This bug has occurred multiple times (Sales, MFG modules) and MUST be prevented.

### Vendor All Third-Party Dependencies
All third-party dependencies must be vendored. After adding or updating any dependency, run `go mod vendor` to ensure the `vendor/` directory is up to date. Never rely on module cache alone - the vendor directory is the source of truth for third-party code.

### Guidelines
- Target file size: under 500 lines of code
- Each file should have a single responsibility
- Refactor proactively when approaching the 500-line threshold
- Use logical module/package organization
- Check for existing shared utilities before creating new ones

---

## Duplication Prevention Rules

### Second Instance Rule
When creating a second instance of any pattern (e.g., a second module, a second similar component), extract a shared abstraction immediately. Do not copy a file and replace identifiers. The second consumer is the forcing function for abstraction - do not wait for a third.

### Copy-Paste Detection
If the only differences between two files are identifiers, names, or configuration values, the logic MUST be extracted into a shared component that accepts those values as parameters. Before creating a new module or feature file, diff it against the nearest equivalent. If the diff shows only namespace changes (e.g., `HCM` to `FIN`), string literal changes, or data differences - the logic is generic and must be shared.

### Configuration vs. Logic Separation
Module-specific files should contain only data (configuration, definitions, mappings). All behavioral logic (CRUD operations, navigation, service lookups, DOM manipulation, event handlers, fetch calls) must live in shared components. A module consists of:
- A config file (unique data)
- Data files (enums, columns, forms - unique per sub-module)
- An init file that calls a shared factory (~10 lines)

### Shared Components Before the Second Module
The shared abstraction layer must be created as part of building the first module, or at latest refactored out before the second module ships. Never ship a second module by copying the first. If the first module embedded behavioral logic, the second module's implementation must include extracting that logic into shared components.

### New Module Checklist
Before creating a new module, verify it only needs configuration files:
- Does it need its own navigation logic? -> No, use the shared navigation component.
- Does it need its own CRUD handlers? -> No, use the shared CRUD component.
- Does it need its own form wrapper? -> No, use the shared form framework.
- Does it need its own service lookup? -> No, use the shared service registry.
If any answer is "yes," fix the shared component - do not work around it with a module-specific copy.

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
