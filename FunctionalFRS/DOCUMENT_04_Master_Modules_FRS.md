# ZYGER ERP — MASTER (SETUP) MODULES
# DOCUMENT 04 — COMPLETE MASTER MODULES FRS (ITEM MASTER / STORE MASTER / CUSTOMER LIST / SUPPLIER LIST)

| | |
|---|---|
| Project | Zyger ERP |
| Module | Master (Setup) — Item Master, Store Master, Customer List, Supplier List |
| Document | DOCUMENT 04 — Complete Master Modules Functional Requirements Specification |
| Status | FRS — module-level |
| Version | 1.0 |

**How to read this document.** FRS for the four core master aggregates. Defines functional
requirements (FR-MAS-*), business rules (BR-MAS-*), workflows (WF-MAS-*), validation, and
integration contracts. All field names/values match the implemented system.

---

## TABLE OF CONTENTS

01. Module Overview and Shared Master Principles
02. Item Master (Full) + Item Variants
03. Store Master (Store / Location / Rack / Bin)
04. Customer List
05. Supplier List
06. Supporting Masters (Item Group, UOM)
07. Workflows (WF-MAS)
08. Business Rules (BR-MAS)
09. Roles and Permissions
10. Database Impact Summary
11. API Impact Summary
12. Cross-Module Consumption Map
13. Open Gaps and Known Limitations

---

## 01. MODULE OVERVIEW AND SHARED MASTER PRINCIPLES

### 01.1 Shared principles
- **Code + Name identity:** every master has a mandatory unique code and name (case-
  insensitive duplicate check); `next-code` endpoints generate codes for new records.
- **Active/Inactive lifecycle** (`active` boolean) plus soft-delete; a few masters allow
  hard delete when no references exist.
- **Plant scoping:** masters carry `plant_id` (default 1) and are consumed across all modules.
- **Cache:** master reads are cached (Caffeine); reference data is treated as read-mostly.
- **Audit columns:** `created_at/by`, `updated_at/by`, `version` on every master table.

### 01.2 Master real estate
- Party master (kind `CUSTOMER` / `SUPPLIER`) is the persisted aggregate behind both the
  Customer List and the Supplier List screens (JSON columns hold contacts, addresses,
  delivery/bank accounts, documents).
- Location/Rack/Bin form the **store hierarchy** (store → location → rack → bin).

---

## 02. ITEM MASTER (FULL)

### 02.1 Screens
| Screen | Item class |
|---|---|
| `ItemMasterScreen` | Unified master (tabs: Basic Info, Purchase, Sales, Engineering, Inventory, UOM) |
| `purchasable-item` (`PurchasableItemScreen`) | Purchasable Item |
| `manufacturing-item` (`ManufacturingItemScreen`) | Manufacturing Item |
| `customer-supplied-item` (`CustomerSuppliedItemScreen`) | Customer Supplied Item (customer-owned, `customer_owned=true`) |
| `item-group-master`, `uom-master` | Supporting masters |

### 02.2 Header/identity fields
`code`*, `name`*, `printName`, `description`, `category`, `itemType` (`RAW_MATERIAL`/
`FINISHED_GOOD`/`SEMI_FINISHED`/`CONSUMABLE`/`TOOL`/`SPARE_PART`), `itemGroupId`
(item group reference), `uom`, `uomId`, `active`.

### 02.3 Purchase tab
`minOrderQty`, `defaultRate`, `leadTimeDays`, `purchaseLeadTimeDays`, `supplierLeadTime`,
`purchaseUom`, `hsnCode`, `hsCode`, `orderMultiple`, `orderingPolicy`,
`preferredSupplier`.

### 02.4 Sales tab
`defaultRate` (selling), `defaultWarehouse`, `customerCode`, `customerOwned`.

### 02.5 Engineering tab
`drawingNumber`, `drawingRevision`, `drawingPath`, `materialGrade`, `materialType`,
`hardness`, `surfaceFinish`, `tolerance`, `dimensions`, `dimensionType`, `weight`,
`weightUom`, `specification`, `manufacturer`, `productType`, `manufacturingLeadTimeDays`.

### 02.6 Inventory tab
`safetyStock`/`safetyStockQty`, `minStockLevel`/`minStockQty`, `maxStockLevel`/`maxStockQty`,
`reorderPoint`, `avgDailyConsumption`, `defaultReceivingStore`, `defaultWarehouse`,
`batchControl` (bool), `serialControl` (bool), `requiresBatch` (bool), `requiresHeat` (bool),
`inspectionRequired` (bool), `shelfLifeDays`, `fixedLotSize`, `storageCategory`,
`abcClass`, `planningPolicy`, `barcode`, `conversionFactor`, `substituteItems`,
`alternateItems`, `parentItem`, `revision`, `extraData`.

### 02.7 Validation rules (BR-MAS-ITEM)
| ID | Rule |
|---|---|
| BR-MAS-ITEM-1 | `code` and `name` mandatory and code unique. |
| BR-MAS-ITEM-2 | Item class variants resolve as: Purchasable (purchase sourcing), Manufacturing
  (`itemType` finished/semi with production), Customer Supplied (`customer_owned=true`,
  `customerCode` set). |
| BR-MAS-ITEM-3 | `batchControl`/`serialControl`/`requiresBatch`/`requiresHeat` drive mandatory
  lot/serial entry on inventory transactions. |
| BR-MAS-ITEM-4 | Min/max/EOQ sanity checks: `minStockQty ≤ maxStockQty`; quantities ≥ 0. |
| BR-MAS-ITEM-5 | HSN mandatory for purchasable/taxable items; `hsnCode`/`hsCode` captured. |
| BR-MAS-ITEM-6 | Inactive items cannot be used in new transactions; existing references remain. |

### 02.8 API (MasterController `/api/master`)
`GET/POST /items`, `GET/PUT/DELETE /items/{id}`, `GET /items/next-code`, `GET /items/search`,
`GET /items/by-type`. Item group / UOM CRUD under `/api/master/item-groups`, `/api/master/uoms`
respectively.

---

## 03. STORE MASTER (STORE / LOCATION / RACK / BIN)

### 03.1 Store
**Screen:** `store-master` (`StoreScreen`). Table `store_master`.

Fields: `code`, `name`, `description`, `storeType` (14 types: Raw Material Store, WIP Store,
Finished Goods Store, Tool Store, Consumable Store, Spare Parts Store, Packing Material Store,
Quarantine Store, Rejection Store, Scrap Store, General Store, Customer Material Store,
Subcontractor Material Store, Dispatch Store), `department`, `locationRef`, `binLocation`,
`capacity`, `isQcHold`, `isWip`, `isFinished`, `isRaw`, `isScrap`, `isDispatch`, `active`,
`remarks`.

- BR-MAS-STORE-1: `code`/`name` mandatory; name unique; auto `next-code`.
- BR-MAS-STORE-2: Store flags (`isRaw`, `isWip`, `isFinished`, `isScrap`, `isDispatch`,
  `isQcHold`) constrain default stock status for receipts into the store.
- BR-MAS-STORE-3: Store → Location → Rack → Bin hierarchy; a bin may map to a default
  store/location.

### 03.2 Location
**Screen:** `location-master` (`LocationMasterScreen`). Table `master_location`
(`location_master`).
Fields: `code`, `name`, `type`, `parentLocation`, `address`, `city`, `state`, `pincode`,
`country`, `contactPerson`, `phone`, `email`, `active`. API `GET /api/master/locations/next-code`.

### 03.3 Rack
**Screen:** `rack-master` (`RackScreen`). Fields: `code`, `name`, `storeCode`, `locationRef`,
`rowNumber`, `columnNumber`, `capacity`, `active`. API `GET /api/master/racks/next-code`.

### 03.4 Bin
**Screen:** `bin-master` (`BinScreen`). Fields: `code`, `name`, `rackCode`, `storeCode`,
`locationRef`, `capacity`, `capacityUom` (6 units), `active`, `remarks`. Cascading deletes:
deleting a store/location/rack cascades to its children. API `GET /api/master/bins/next-code`.

### 03.5 Business rules
| ID | Rule |
|---|---|
| BR-MAS-STORE-4 | Master delete blocked while any dependent transaction/child master references it (soft delete otherwise). |
| BR-MAS-STORE-5 | Code unique per level (stores, locations, racks, bins). |
| BR-MAS-STORE-6 | Store references must exist before racks/bins can be created against them. |

---

## 04. CUSTOMER LIST

**Screen:** `customer-list` (`CustomerListScreen`, `CustomerForm`, `customerTypes`).
**Entity:** Party with `kind=CUSTOMER`. Table `party_master` (JSON columns).

### 04.1 Identity / General
`code`*, `name`*, `displayName`, `legalName`, `printName`, `customerType`, `customerCategory`,
`industry`, `businessType` (A2B/B2B/B2C), `businessNature`, `companyRegNo`, `cin`, `pan`,
`website`, `establishedDate`, `numberOfEmployees`, `annualTurnover`, `customerRating`
(A/B/C), `customerPriority` (High/Medium/Low), `customerStatus` (Active/Inactive/Blocked),
`customerGroup`, `salesperson`, `onboardingDate`, `territory`, `pricingGroup`, `customerTaxId`,
`remarks`.

### 04.2 Contacts (repeating)
`contactPersonName`, `designation`, `department`, `mobileNumber`, `alternateMobile`,
`landline`, `email`, `alternateEmail`, `whatsappNumber`, `preferredCommunication`,
`primaryContact`, `active`, `remarks`. (At least one primary contact.)

### 04.3 Addresses (repeating)
`addressName`, `addressType` (Registered/Billing/Shipping/Delivery/Pickup/Other),
`addressLine1..3`, `areaLocality`, `city`, `district`, `state`, `country`, `pinZipCode`,
`phone`, `email`, `gstin`, `contactPerson`, `latitude`, `longitude`, `defaultAddress`, `active`.

### 04.4 Delivery addresses (repeating)
Extends address with `deliveryLocationCode`, `contactMobile`, `contactEmail`,
`deliveryTimeFrom`, `deliveryTimeTo`, `deliveryWorkingDays`, `gateEntryInstructions`,
`vehicleRestrictions`, `specialDeliveryInstructions`, `defaultDeliveryLocation`.

### 04.5 Bank accounts (repeating)
`bankAccountName`, `accountNumber`, `confirmAccountNumber`, `bankName`, `branchName`,
`branchAddress`, `ifscCode`, `swiftCode`, `micrCode`, `accountType`
(Current/Savings/Cash Credit/Overdraft/Other), `currency`, `beneficiaryName`,
`defaultBankAccount`, `active`, `verificationStatus`, `remarks`.

### 04.6 Statutory / GST
`gstRegistrationStatus`, `gstin`, `gstRegistrationType` (Regular/Composition/Unregistered/
SEZ/Deemed Export/Export/Other), `gstEffectiveDate`, `gstExpiryDate`, `gstState`,
`taxpayerType`, `eInvoiceApplicable`, `eWayBillApplicable`, `tdsApplicable`, `tcsApplicable`,
`taxExemption`, `taxExemptionNumber`, `taxExemptionFrom/To`, `panNumber`, `panHolderName`,
`panStatus`, `defaultTaxCategory`, `defaultGstRate`, `tdsSection`, `tdsRate`, `tcsRate`,
`reverseChargeApplicable`.

### 04.7 Commercial
`currency`, `paymentTerms`, `creditLimit`, `creditDays`, `paymentMethod`, `priceList`,
`discount`/`discountPct`, `salesTerritory`, `incoterms`, `freightTerms`, `insuranceTerms`,
`deliveryTerms`, `billingCycle` (Immediate/Weekly/Monthly), `creditHold`, `creditHoldReason`,
`advanceRequired`, `advancePercentage`.

### 04.8 Documents (repeating)
`documentType` (GST Certificate, PAN Card, Company Registration, MSME Certificate, Purchase
Agreement, NDA, Quality Agreement, Supplier/Customer Registration, Bank Confirmation,
Customer Drawing Agreement, Other), `documentNumber`, `documentDate`, `expiryDate`,
`attachment`, `remarks`, `status`.

### 04.9 Business rules (BR-MAS-CUST)
| ID | Rule |
|---|---|
| BR-MAS-CUST-1 | `code` and `name` mandatory; code unique per party kind. |
| BR-MAS-CUST-2 | `customerStatus=Blocked` prevents new sales orders / dispatch (BLOCKED guard). |
| BR-MAS-CUST-3 | GST fields validated when `gstRegistrationStatus` requires; state derived `gstState`. |
| BR-MAS-CUST-4 | At least one default address and one primary contact required for approval to transact. |
| BR-MAS-CUST-5 | Credit hold flag consulted by sales order / invoice workflows. |

### 04.10 API
`GET/POST /api/master/customers`, `GET/PUT/DELETE /api/master/customers/{id}`,
`GET /api/master/customers/next-code`, `GET /api/master/parties?kind=CUSTOMER`.

---

## 05. SUPPLIER LIST

**Screen:** `supplier-list` (`SupplierListScreen`, `SupplierForm`, `supplierTypes`).
**Entity:** Party with `kind=SUPPLIER`. Table `party_master` (JSON columns).

### 05.1 Identity / General
`code`*, `name`*, `displayName`, `legalName`, `printName`, `supplierType` (10 types: Raw
Material Supplier, Tool Supplier, Consumable Supplier, Machine Supplier, Spare Parts
Supplier, Subcontractor / Job Worker, Service Provider, Packaging Supplier, General Supplier,
Other), `supplierCategory` (Raw Material/Tool/Consumable/Subcontract/Packaging/General/Other),
`supplierGroup`, `industry`, `businessNature`, `companyRegNo`, `cin`, `pan`, `website`,
`rating` (A/B/C), `status` (Active/Inactive/Blocked), `msmeNo`, `msmeType`, `establishedDate`,
`annualTurnover`, `numberOfEmployees`, `leadTimeDays`, `minOrderValue`, `minOrderQty`,
`paymentTerms`, `creditDays`, `remarks`.

### 05.2 Contact / Address / Bank / GST / Documents
Same field shapes as Customer (§04.2–04.4, 04.6, 04.8), with supplier defaults:
`state=Tamil Nadu`, `gstRegType=Regular`, `currency=INR`, `paymentTerms=30 Days`,
`creditDays=30`, `deliveryTerms=Door Delivery`, `transportMode=Road`, `ledgerGroup=Sundry
Creditors`, `openingBalance`, `drCr`.

### 05.3 Commercial / Sourcing
`qualityCertRequired`, `inspectionRequired`, `deliveryTerms`, `transportMode`, `transporterName`,
`ledgerGroup`, `openingBalance`, `drCr`; item sourcing relationship grid **Items Supplied**
(item code + status per supplier).

### 05.4 Business rules (BR-MAS-SUP)
| ID | Rule |
|---|---|
| BR-MAS-SUP-1 | `code`/`name` mandatory; code unique. |
| BR-MAS-SUP-2 | `status=Blocked` blocks new purchase docs (PR/PO/JO/po-inward) — purchase-side BLOCKED guard. |
| BR-MAS-SUP-3 | `inspectionRequired` on supplier/items triggers inspection-required flows (IQC/GRN QC_HOLD). |
| BR-MAS-SUP-4 | `qualityCertRequired` requires MTC/CoC evidence on incoming supply. |

### 05.5 API
`GET/POST /api/master/suppliers`, `GET/PUT/DELETE /api/master/suppliers/{id}`,
`GET /api/master/suppliers/next-code`, `GET /api/master/parties?kind=SUPPLIER`.

---

## 06. SUPPORTING MASTERS

### 06.1 Item Group
Fields: `code`, `name`, `description`, `parentGroup`, `groupType` (incl. Purchasable Item),
`active`. Items inherit group defaults (UOM, tax category) when left blank.

### 06.2 UOM
Fields: `code`, `name`, `unitType` (Nos/Kg/Meter/Litre/Set/Box/Pcs), `shortName`, `conversionFactor`,
`baseUom`, `active`.

### 06.3 Supplier BLOCKED integration
Party `approvalStatus`/`customerStatus` `BLOCKED` is enforced by purchase (`isPurchaseDoc`),
customer dispatch, and inward workflows.

---

## 07. WORKFLOWS (WF-MAS)

```
Create (code+name validated) → Active → Edit (versioned) → Inactivate / Block
   │                                                           │
   └── next-code auto-generation ──────────────────────────────┘
   Delete: soft unless no references → hard delete allowed
```
No multi-stage approval for masters (single-step create/update lifecycle); transactional
documents reference masters by code and observe A/I/B state at the point of use.

### 07.1 Store hierarchy workflow
```
Create Store → Create Location → Create Rack → Create Bin (each child requires parent)
Delete Bin → Delete Rack → Delete Location → Delete Store (cascade guards)
```

---

## 08. BUSINESS RULES (BR-MAS)

| ID | Rule |
|---|---|
| BR-MAS-CODE-1 | Code and name mandatory; unique codes per master. |
| BR-MAS-ACTIVE-1 | Inactive/Blocked records excluded from dropdowns and new transactions. |
| BR-MAS-DEL-1 | Soft delete always; hard delete only when zero references. |
| BR-MAS-CASCADE-1 | Deleting a store/location/rack cascades child racks/bins (guarded by references). |
| BR-MAS-PLANT-1 | Masters scoped by plant_id where multi-plant. |
| BR-MAS-CACHE-1 | Master reads cached; cache invalidated on write. |

---

## 09. ROLES AND PERMISSIONS

| Permission | Capabilities |
|---|---|
| MASTER (module) | View, Create, Edit, Delete, Export, Print |
| MASTER.ITEM, MASTER.STORE, MASTER.PARTY | Screen-level grants |
| Admin | Full master maintenance + numbering config |

---

## 10. DATABASE IMPACT SUMMARY

| Table | Summary |
|---|---|
| `item_master` | 60+ columns incl. code/name/description, item_type, group/UOM FKs, purchase/sales/
  engineering/inventory fields, batch/serial/inspection flags, min/max/safety/reorder,
  HSN, drawing, dimensions, substitutes. |
| `item_group` | group hierarchy + type |
| `uom` | unit + conversion |
| `store_master` | store + 14 types + flags |
| `master_location` / `location_master` | locations |
| `rack_master` / `bin_master` | hierarchy levels |
| `party_master` | kind=CUSTOMER / SUPPLIER with JSON `contacts_json`, `addresses_json`,
  `delivery_addresses_json`, `bank_accounts_json`, `documents_json`, plus statutory/commercial
  columns (`discount_pct`, `approval_status`, `credit_limit`, `gstin`, etc.) |

---

## 11. API IMPACT SUMMARY (`/api/master`)

- Items: `GET/POST /items`, `GET/PUT/DELETE /items/{id}`, `GET /items/next-code`,
  `GET /items/search`, `GET /items/by-type`.
- Stores: `GET/POST /stores`, `GET/PUT/DELETE /stores/{id}`.
- Locations: `GET/POST /locations`, `GET/PUT/DELETE /locations/{id}`, `GET /locations/next-code`.
- Racks: `GET/POST /racks`, `GET/PUT/DELETE /racks/{id}`, `GET /racks/next-code`.
- Bins: `GET/POST /bins`, `GET/PUT/DELETE /bins/{id}`, `GET /bins/next-code`.
- Parties: `GET/POST /customers`, `/suppliers`, `…/{id}`, `next-code`, `GET /parties?kind=`.
- Group/UOM: `/item-groups`, `/uoms` CRUD.
- Lookups: `/purchase-orders`, `/job-orders`, `/aql-lookup` (cross-module ref docs).

---

## 12. CROSS-MODULE CONSUMPTION MAP

| Master | Consumed by |
|---|---|
| Item master | Purchase (PR/SE/SQ/PO/JO), Inventory (inward/issue/DC/returns), Production (BOM/consumption/output), Quality (inspection plans, IQC), Planning (material planning), Sales |
| Store/Location/Rack/Bin | Inventory stock posting (default receiving store, location), stock balance, allotment |
| Customer party | Sales (SO/DC/Invoice/Returns), Quality (complaints, concessions, CoC), Dispatch |
| Supplier party | Purchase (PR/SE/SQ/PO/JO), Inventory (inward, invoices, returns), Quality (scorecard, SCAR, IQC) |

---

## 13. OPEN GAPS AND KNOWN LIMITATIONS

1. **`/api/master/stores/next-code` does not exist** while locations/racks/bins have
   `next-code` endpoints — store code auto-generation falls back to client or manual entry.
2. Party contacts/addresses/banks/documents are **JSON columns**; cross-row reporting on them
   requires JSONB queries (not normalized).
3. Item master has overlapping legacy columns (`min_stock_level` vs `min_stock_qty`,
   `safety_stock` vs `safety_stock_qty`) — consumers must standardize; entity `discount_pct`
   vs legacy `party_master.discount` drift noted in staging schema validation.
4. No multi-level approval (active → requested → approved) on masters; only A/I/B states.
5. Hard-delete behavior varies per master (validated empirically in `MasterController`).

---

*End of DOCUMENT 04 — Master Modules FRS.*