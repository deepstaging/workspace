# Deepstaging eShop Documentation Research — Complete

## 📋 Research Summary

This directory contains comprehensive research for writing a Deepstaging eShop setup documentation chapter.

### Documents Generated

1. **`DEEPSTAGING_ESHOP_RESEARCH.md`** (651 lines, 23KB)
   - Complete research repository of all eShop code locations
   - Existing documentation structure analysis
   - All .csproj/.sln files and generators
   - TUnit test patterns and examples
   - Complete attribute definitions with signatures
   - Code snippets from actual eShop implementation

2. **`ESHOP_ARCHITECTURE_GUIDE.md`** (528 lines, 19KB)
   - Visual architecture diagrams
   - Data flow examples
   - Code generation pipeline (TypedId → StoredEntity → DataStore → Handlers)
   - Test execution flow
   - File-by-file documentation guide
   - Pattern reference (Lookup, Owned Collections, Effect Composition)
   - Commands vs Queries mapping

3. **`QUICK_REFERENCE_FOR_DOCS.md`** (240 lines, 7.6KB)
   - Quick lookup for file paths
   - API signatures for all attributes
   - Documentation patterns from existing chapters
   - Data to include in your chapter
   - Writing checklist

## 🎯 Key Findings

### eShop Project Structure
- **Location:** `/Users/chris/org/deepstaging/repos/samples/eShop/`
- **Solution file:** `eShop.slnx`
- **Bounded contexts:** 4 (Catalog, Basket, Ordering, Payment)
- **Shared assembly:** eShop.Contracts (IDs and IntegrationEvents)
- **Test projects:** 6 (one per context + integration + AppHost)

### Attribute API Summary
| Attribute | Target | Purpose |
|-----------|--------|---------|
| `[TypedId]` | struct | Strongly-typed ID generation |
| `[TypedIdProfile]` | assembly | Configure ID defaults |
| `[StoredEntity]` | class | Generate CRUD methods |
| `[DataStore]` | class | Container for entity stores |
| `[Lookup]` | property | Generate GetBy{Property}Async |
| `[CommandHandler]` | method | Mark command handler |
| `[QueryHandler]` | method | Mark query handler |
| `[DispatchModule]` | class | Generate command/query dispatch |
| `[Runtime]` | class | Composition root |
| `[IntegrationEvent]` | record | Cross-context event |

### Documentation Structure
**Location:** `/Users/chris/org/deepstaging/repos/deepstaging/docs/guide/`

The guide follows a consistent 3-chapter style (project-setup, commands-and-queries, integration-testing) with:
1. Problem statement
2. Conceptual explanation
3. Code examples (with file paths)
4. "What Gets Generated" callout boxes
5. TUnit test examples
6. Cross-references to module docs

### Generated Code Scope

**TypedId generates:**
- IEquatable, IComparable, IParsable
- ToString(), New(), equality operators
- Optional: JsonConverter, EfCoreValueConverter

**StoredEntity generates:**
- GetByIdAsync, GetByIdsAsync
- SaveAsync, SaveManyAsync, DeleteAsync
- QueryAsync (with pagination)
- GetBy{Property}Async for each [Lookup]

**DataStore generates:**
- Nested entity store classes
- ICatalogStoreCapability interface
- All CRUD effect methods

**DispatchModule generates:**
- Public dispatch methods for commands/queries
- Effect method signatures
- Delegate to handlers

## 📁 File Paths for Your Chapter

### Must-Reference Source Files
```
eShop.Contracts/Ids.cs
eShop.Contracts/IntegrationEvents.cs
eShop.Catalog/Domain/CatalogItem.cs
eShop.Catalog/Domain/Commands/DeductOrderStock.cs
eShop.Catalog/Domain/Queries/GetCatalogItems.cs
eShop.Catalog/Runtime.cs
eShop.Basket/Domain/CustomerBasket.cs
eShop.Ordering/Domain/Order.cs
```

### Must-Reference Test Files
```
eShop.Catalog.Tests/CatalogTestBase.cs
eShop.Catalog.Tests/Domain/Queries/GetCatalogItemByIdTests.cs
eShop.Catalog.Tests/IntegrationSetup.cs
eShop.Catalog.Tests/UnitDefaults.cs
eShop.Catalog.Tests/GlobalUsings.cs
```

### Attribute Definition Files
```
Deepstaging.Abstractions/Ids/TypedIdAttribute.cs
Deepstaging.Abstractions/Ids/TypedIdProfileAttribute.cs
Deepstaging.Abstractions/DataStore/StoredEntityAttribute.cs
Deepstaging.Abstractions/DataStore/DataStoreAttribute.cs
Deepstaging.Abstractions/DataStore/LookupAttribute.cs
```

### Existing Guide Examples
```
docs/guide/index.md — eShop guide overview
docs/guide/project-setup.md — Chapter 1 reference style
docs/guide/commands-and-queries.md — CQRS pattern examples
mkdocs.yml — Documentation structure
```

## 💡 What to Document

### Chapter 1 Content (Project Setup)
1. **Strongly-Typed IDs**
   - Assembly-level TypedIdProfile
   - Multiple [TypedId] structs
   - Backing types (Guid, String)
   - Generated capabilities

2. **Stored Entities**
   - [StoredEntity] attribute
   - Domain model design
   - [Lookup] for related entities
   - Owned collections (BasketItem inside CustomerBasket)

3. **Data Store**
   - [DataStore] container
   - Generated CRUD methods
   - Store interfaces
   - DI registration

4. **Runtime Composition**
   - [Runtime] attribute
   - [Uses] for capability injection
   - Multiple DataStores, EventQueues, etc.
   - Partial class pattern

5. **Testing**
   - CatalogTestBase pattern
   - Mode-aware tests (IsIntegration)
   - Test fixture composition
   - TUnit [Test] attribute

### Example Patterns to Show

**Lookup Example:**
```csharp
[StoredEntity]
public partial record CatalogItem
{
    [Lookup] public CatalogTypeId CatalogTypeId { get; set; }
}
// Generates: GetByCatalogTypeIdAsync(typeId)
```

**Owned Collection Example:**
```csharp
[StoredEntity]
public partial record CustomerBasket
{
    public List<BasketItem> Items { get; init; } = [];
}
// BasketItem is NOT [StoredEntity], just a record
```

**Multi-Lookup Example:**
```csharp
[StoredEntity]
public partial record CatalogItem
{
    [Lookup] public CatalogTypeId CatalogTypeId { get; set; }
    [Lookup] public CatalogBrandId CatalogBrandId { get; set; }
}
// Generates both GetByCatalogTypeIdAsync AND GetByCatalogBrandIdAsync
```

## 🔍 How to Use These Documents

1. **Start with QUICK_REFERENCE_FOR_DOCS.md**
   - Get file paths and API signatures
   - Check the writing checklist

2. **Reference ESHOP_ARCHITECTURE_GUIDE.md**
   - Understand the generation pipeline
   - See data flow examples
   - Learn pattern implementations

3. **Consult DEEPSTAGING_ESHOP_RESEARCH.md**
   - Find complete code snippets
   - Reference existing documentation patterns
   - Get comprehensive attribute documentation

4. **Study existing chapters**
   - `project-setup.md` for structure & style
   - `commands-and-queries.md` for handler patterns
   - `integration-testing.md` for test patterns

## ✅ Checklist for Your Chapter

- [ ] Title and problem statement (why setup matters)
- [ ] Namespace organization (Catalog/Domain/Commands, etc.)
- [ ] [TypedId] examples (Guid-backed, String-backed)
- [ ] [TypedIdProfile] assembly-level configuration
- [ ] [StoredEntity] with multiple entities
- [ ] [Lookup] properties and generated methods
- [ ] Owned collections (BasketItem pattern)
- [ ] [DataStore] container structure
- [ ] [Runtime] composition with [Uses]
- [ ] GlobalUsings.cs pattern
- [ ] CatalogTestBase test fixture pattern
- [ ] TUnit test examples (GetCatalogItemByIdTests)
- [ ] Integration vs unit test modes (TestMode.IsIntegration)
- [ ] "What Gets Generated" callout boxes
- [ ] Cross-references to module docs (ids, datastore, dispatch, effects)
- [ ] Link to next chapter (Effects & Runtime or Commands & Queries)

## 📊 Statistics

| Metric | Value |
|--------|-------|
| eShop source files analyzed | 55+ |
| Test files analyzed | 30+ |
| Attribute files reviewed | 40+ |
| Code snippets documented | 20+ |
| Existing guide chapters | 10 |
| Bounded contexts | 4 |
| Total research lines | 1,419 |

## 🚀 Next Steps

1. Open QUICK_REFERENCE_FOR_DOCS.md for file paths
2. Read ESHOP_ARCHITECTURE_GUIDE.md for patterns
3. Review DEEPSTAGING_ESHOP_RESEARCH.md for code details
4. Open existing guide chapters in `/repos/deepstaging/docs/guide/`
5. Write your chapter using the pattern and checklist
6. Reference actual eShop files with absolute paths

---

## Document Organization

All three research documents are cross-referenced:

- **DEEPSTAGING_ESHOP_RESEARCH.md** → Source of truth for code snippets and file locations
- **ESHOP_ARCHITECTURE_GUIDE.md** → Visual and conceptual understanding
- **QUICK_REFERENCE_FOR_DOCS.md** → Quick lookup for common queries

Use these documents as reference materials while writing. Copy code snippets directly from DEEPSTAGING_ESHOP_RESEARCH.md to ensure accuracy.

---

**Research completed:** March 10, 2024
**Total effort:** Comprehensive codebase analysis
**Ready for:** Documentation chapter creation
