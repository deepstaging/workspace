# Deepstaging eShop Documentation Research — File Index

## 🗂️ Research Documents (4 Files)

Located in: `/Users/chris/org/deepstaging/`

### 1. **README_RESEARCH.md** ← START HERE
- **Purpose:** Overview of all research and how to use it
- **Size:** ~1.6 KB
- **Contents:**
  - Quick summary of each document
  - Key findings and statistics
  - File path summary
  - Usage instructions
  - Checklist for your chapter

### 2. **QUICK_REFERENCE_FOR_DOCS.md**
- **Purpose:** Quick lookup while writing
- **Size:** 7.6 KB
- **Contents:**
  - File paths for source files
  - API signatures for attributes
  - Documentation patterns
  - Writing checklist

### 3. **ESHOP_ARCHITECTURE_GUIDE.md**
- **Purpose:** Visual understanding of architecture and patterns
- **Size:** 19 KB
- **Contents:**
  - ASCII architecture diagrams
  - Bounded context structure
  - Code generation pipeline
  - Data flow examples
  - File-by-file guide
  - Pattern reference

### 4. **DEEPSTAGING_ESHOP_RESEARCH.md**
- **Purpose:** Complete research database
- **Size:** 23 KB
- **Contents:**
  - eShop project structure (with file paths)
  - Documentation structure analysis
  - .csproj/.sln files and generators
  - TUnit test patterns
  - Complete attribute definitions
  - Code snippets from eShop

---

## 📍 Where Everything Is

### eShop Source Code
```
/Users/chris/org/deepstaging/repos/samples/eShop/
├── src/
│   ├── eShop.Contracts/          ← Shared IDs & Events
│   ├── eShop.Catalog/            ← Catalog bounded context
│   ├── eShop.Basket/             ← Basket bounded context
│   ├── eShop.Ordering/           ← Ordering bounded context
│   ├── eShop.Payment/            ← Payment bounded context
│   └── eShop.AppHost/            ← Aspire hosting
└── test/
    ├── eShop.Catalog.Tests/
    ├── eShop.Basket.Tests/
    ├── eShop.Ordering.Tests/
    ├── eShop.Payment.Tests/
    ├── eShop.Integration.Tests/
    └── eShop.AppHost.Tests/
```

### Deepstaging Documentation
```
/Users/chris/org/deepstaging/repos/deepstaging/docs/
├── guide/
│   ├── index.md                          ← eShop guide overview
│   ├── project-setup.md                  ← Chapter 1 style reference
│   ├── commands-and-queries.md           ← CQRS examples
│   └── [7 more chapters]
├── modules/
│   ├── ids/
│   ├── datastore/
│   ├── dispatch/
│   ├── effects/
│   └── [more modules]
└── testing/
```

### Attribute Definitions
```
/Users/chris/org/deepstaging/repos/deepstaging/src/Core/Deepstaging.Abstractions/
├── Ids/
│   ├── TypedIdAttribute.cs
│   └── TypedIdProfileAttribute.cs
├── DataStore/
│   ├── StoredEntityAttribute.cs
│   ├── DataStoreAttribute.cs
│   └── LookupAttribute.cs
├── Dispatch/
│   ├── CommandHandlerAttribute.cs
│   └── QueryHandlerAttribute.cs
└── [more attributes]
```

---

## 🎯 How to Use These Documents

### If you want to...

**...understand the overall structure**
→ Read `README_RESEARCH.md` (this page plus summary)

**...find a specific file path**
→ Check `QUICK_REFERENCE_FOR_DOCS.md` (file path section)

**...understand how code generation works**
→ Read `ESHOP_ARCHITECTURE_GUIDE.md` (generation pipeline)

**...see complete code snippets**
→ Look in `DEEPSTAGING_ESHOP_RESEARCH.md` (code section)

**...understand patterns (Lookup, Owned Collections, etc.)**
→ Check `ESHOP_ARCHITECTURE_GUIDE.md` (patterns section)

**...get a writing checklist**
→ Use `QUICK_REFERENCE_FOR_DOCS.md` (checklist at end)

**...see existing documentation style**
→ Open `/Users/chris/org/deepstaging/repos/deepstaging/docs/guide/project-setup.md`

---

## 📋 Quick Navigation

### Core Attributes You'll Document
1. **`[TypedId]`** — Strongly-typed IDs
   - File: `TypedIdAttribute.cs`
   - Example: `CatalogItemId`, `BuyerId`

2. **`[TypedIdProfile]`** — Configure ID defaults
   - File: `TypedIdProfileAttribute.cs`
   - Example: Assembly-level converters config

3. **`[StoredEntity]`** — Generate CRUD
   - File: `StoredEntityAttribute.cs`
   - Example: `CatalogItem`, `CustomerBasket`

4. **`[DataStore]`** — Container for stores
   - File: `DataStoreAttribute.cs`
   - Example: `CatalogStore`

5. **`[Lookup]`** — Generate GetBy methods
   - File: `LookupAttribute.cs`
   - Example: `[Lookup] public CatalogTypeId CatalogTypeId`

### Key eShop Files to Reference
1. **IDs and Events**
   - `eShop.Contracts/Ids.cs` (5 TypedId structs)
   - `eShop.Contracts/IntegrationEvents.cs` (13 events)

2. **Main Entities**
   - `eShop.Catalog/Domain/CatalogItem.cs` (with [Lookup])
   - `eShop.Basket/Domain/CustomerBasket.cs` (with owned collection)

3. **Runtime Setup**
   - `eShop.Catalog/Runtime.cs` (all attributes)

4. **Tests**
   - `eShop.Catalog.Tests/CatalogTestBase.cs` (base class)
   - `eShop.Catalog.Tests/Domain/Queries/GetCatalogItemByIdTests.cs` (test example)

---

## 📊 Document Statistics

| Document | Lines | Size | Content |
|----------|-------|------|---------|
| README_RESEARCH.md | ~180 | 1.6 KB | Index & overview |
| QUICK_REFERENCE_FOR_DOCS.md | 240 | 7.6 KB | Quick lookup |
| ESHOP_ARCHITECTURE_GUIDE.md | 528 | 19 KB | Diagrams & patterns |
| DEEPSTAGING_ESHOP_RESEARCH.md | 651 | 23 KB | Complete research |
| **TOTAL** | **1,599** | **51 KB** | Full research package |

---

## ✅ Research Coverage

### ✅ Completed
- [x] eShop sample code locations (55+ files)
- [x] Documentation structure (10 chapters)
- [x] Project files and solutions
- [x] Source generator information (6 generators)
- [x] Attribute definitions (40+ attributes)
- [x] TUnit test patterns (20+ examples)
- [x] Code generation pipeline
- [x] Data flow examples
- [x] Architecture diagrams
- [x] Writing patterns from existing docs
- [x] File path index
- [x] API signatures

### Ready For
- Writing your documentation chapter
- Referencing actual eShop code
- Understanding Deepstaging concepts
- Following established patterns
- Creating test examples

---

## 🚀 Getting Started

**Step 1:** Read this file (INDEX.md)

**Step 2:** Open **README_RESEARCH.md** for overview

**Step 3:** Choose your task:
- Need file paths? → **QUICK_REFERENCE_FOR_DOCS.md**
- Need architecture? → **ESHOP_ARCHITECTURE_GUIDE.md**
- Need code details? → **DEEPSTAGING_ESHOP_RESEARCH.md**

**Step 4:** Reference the actual files while writing:
- eShop code: `/Users/chris/org/deepstaging/repos/samples/eShop/`
- Docs: `/Users/chris/org/deepstaging/repos/deepstaging/docs/`
- Attributes: `/Users/chris/org/deepstaging/repos/deepstaging/src/Core/Deepstaging.Abstractions/`

**Step 5:** Use QUICK_REFERENCE_FOR_DOCS.md checklist while writing

---

## 🔗 Cross-Document Links

- **README_RESEARCH.md** → Summary, where to start
- **QUICK_REFERENCE_FOR_DOCS.md** → Paths, APIs, checklist
- **ESHOP_ARCHITECTURE_GUIDE.md** → Diagrams, patterns, flows
- **DEEPSTAGING_ESHOP_RESEARCH.md** → Full code, attributes, details

All four documents reference the same files and work together.

---

**Research Date:** March 10, 2024
**Coverage:** Complete eShop + Deepstaging framework analysis
**Status:** Ready for documentation writing
