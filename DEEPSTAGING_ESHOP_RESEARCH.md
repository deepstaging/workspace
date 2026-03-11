# Deepstaging eShop Documentation Research Summary

## 1. eShop Sample Code Location & Structure

**Primary Location:** `/Users/chris/org/deepstaging/repos/samples/eShop`

### Directory Structure
```
eShop/
├── eShop.slnx                          # Solution file (XSD-based project reference)
├── src/
│   ├── eShop.Contracts/               # Shared IDs and IntegrationEvents
│   │   ├── Ids.cs                     # All TypedId definitions
│   │   └── IntegrationEvents.cs       # All [IntegrationEvent] records
│   ├── eShop.Catalog/                 # Catalog bounded context
│   │   ├── Domain/
│   │   │   ├── CatalogItem.cs         # [StoredEntity] main entity
│   │   │   ├── CatalogBrand.cs
│   │   │   ├── CatalogType.cs
│   │   │   ├── Commands/
│   │   │   │   ├── ConfirmOrderStock.cs
│   │   │   │   ├── DeductOrderStock.cs
│   │   │   │   └── UpdateCatalogItemPrice.cs
│   │   │   └── Queries/
│   │   │       ├── GetCatalogItems.cs
│   │   │       ├── GetCatalogItemById.cs
│   │   │       ├── GetCatalogBrands.cs
│   │   │       └── GetCatalogTypes.cs
│   │   ├── Runtime.cs                 # [Runtime], [DataStore], [EventQueue], [DispatchModule], [WebApp]
│   │   ├── GlobalUsings.cs
│   │   ├── Config.cs
│   │   └── Handlers/CatalogIntegrationEventHandlers.cs
│   ├── eShop.Basket/                  # Basket bounded context
│   │   ├── Domain/
│   │   │   ├── CustomerBasket.cs      # [StoredEntity] with owned collection (BasketItem)
│   │   │   ├── Commands/
│   │   │   │   ├── UpdateBasket.cs
│   │   │   │   ├── CheckoutBasket.cs
│   │   │   │   └── DeleteBasket.cs
│   │   │   └── Queries/GetBasket.cs
│   │   ├── Runtime.cs
│   │   ├── Handlers/BasketIntegrationEventHandlers.cs
│   │   └── GlobalUsings.cs
│   ├── eShop.Ordering/                # Ordering bounded context
│   │   ├── Domain/
│   │   │   ├── Order.cs               # [StoredEntity] with state machine
│   │   │   ├── Address.cs
│   │   │   ├── Commands/
│   │   │   ├── Queries/
│   │   │   └── Jobs/GracePeriodJob.cs
│   │   ├── Runtime.cs
│   │   └── Handlers/
│   ├── eShop.Payment/                 # Payment bounded context
│   │   ├── Domain/
│   │   │   └── Commands/ProcessPayment.cs
│   │   ├── Runtime.cs
│   │   └── Handlers/PaymentIntegrationEventHandlers.cs
│   └── eShop.AppHost/                 # Aspire host (Program.cs, Config.cs)
├── test/
│   ├── eShop.Catalog.Tests/
│   │   ├── Domain/Commands/
│   │   ├── Domain/Queries/
│   │   ├── CatalogTestBase.cs
│   │   ├── IntegrationSetup.cs
│   │   ├── IntegrationDefaults.cs
│   │   ├── UnitDefaults.cs
│   │   ├── TestRuntime.cs
│   │   └── GlobalUsings.cs
│   ├── eShop.Basket.Tests/
│   ├── eShop.Ordering.Tests/
│   ├── eShop.Payment.Tests/
│   ├── eShop.Integration.Tests/
│   │   └── Flows/               # End-to-end flow tests
│   └── eShop.AppHost.Tests/
```

### Key Files to Reference
- **Contracts:** `/Users/chris/org/deepstaging/repos/samples/eShop/src/eShop.Contracts/Ids.cs`
- **Integration Events:** `/Users/chris/org/deepstaging/repos/samples/eShop/src/eShop.Contracts/IntegrationEvents.cs`
- **Catalog Entity:** `/Users/chris/org/deepstaging/repos/samples/eShop/src/eShop.Catalog/Domain/CatalogItem.cs`
- **Basket Entity:** `/Users/chris/org/deepstaging/repos/samples/eShop/src/eShop.Basket/Domain/CustomerBasket.cs`
- **Command Handler:** `/Users/chris/org/deepstaging/repos/samples/eShop/src/eShop.Catalog/Domain/Commands/DeductOrderStock.cs`
- **Query Handler:** `/Users/chris/org/deepstaging/repos/samples/eShop/src/eShop.Catalog/Domain/Queries/GetCatalogItems.cs`
- **Runtime Setup:** `/Users/chris/org/deepstaging/repos/samples/eShop/src/eShop.Catalog/Runtime.cs`

---

## 2. Existing Documentation Structure

**Location:** `/Users/chris/org/deepstaging/repos/deepstaging/docs/`

### MkDocs Configuration
- **File:** `/Users/chris/org/deepstaging/repos/deepstaging/mkdocs.yml`
- **Theme:** Material for MkDocs
- **Structure:** Hierarchical nav with modules, guide, testing, concepts

### Guide Chapters
**Location:** `/Users/chris/org/deepstaging/repos/deepstaging/docs/guide/`

| File | Purpose | Status |
|------|---------|--------|
| `index.md` | **eShop Guide Overview** (4.2 KB) - Lists 9 chapters with table | ✅ Exists |
| `project-setup.md` | **Chapter 1** - Solution creation, TypedId intro (4.5 KB) | ✅ Exists |
| `effects-and-runtime.md` | **Chapter 2** - Runtime, Eff<RT,T> (7.7 KB) | ✅ Exists |
| `commands-and-queries.md` | **Chapter 3** - CQRS, Dispatch (11.7 KB) | ✅ Exists |
| `adding-a-web-api.md` | **Chapter 4** - Web endpoints (8.7 KB) | ✅ Exists |
| `event-driven.md` | **Chapter 6** - Integration events (8.9 KB) | ✅ Exists |
| `infrastructure.md` | **Chapter 8** - Aspire, BYOC (10.7 KB) | ✅ Exists |
| `integration-testing.md` | **Chapter 9** - E2E testing (13.2 KB) | ✅ Exists |
| `testing-effects.md` | **Chapter** - Effects testing (11.8 KB) | ✅ Exists |
| `validation-and-authorization.md` | **Chapter** - Validation & Auth (8.1 KB) | ✅ Exists |

### Existing Documentation Style
The guides follow a consistent pattern:
1. **Problem statement** — What challenge this chapter solves
2. **Code examples** — Inline with triple backticks, language-tagged (e.g., `title="Path/File.cs"`)
3. **Narrative explanations** — Prose explaining the "why"
4. **Generated code callouts** — Note boxes highlighting what gets generated
5. **Test examples** — How to test this feature using TUnit
6. **Links** — Cross-references to module docs and concepts

**Example structure from project-setup.md:**
```markdown
## Create the Solution
## Install Packages
## Define the Domain
[code example]
The generator produces...
[note about generated code]
## Create an Entity
[more examples]
```

### Additional Documentation Locations
- **Module Documentation:** `/Users/chris/org/deepstaging/docs/modules/` (effects, dispatch, ids, datastore, eventstore, etc.)
- **Testing Docs:** `/Users/chris/org/deepstaging/docs/testing/`
- **Concepts:** `/Users/chris/org/deepstaging/docs/concepts/`

---

## 3. .csproj, .sln Files & Source Generators

### eShop Project Files

**eShop Solution File:**
```
/Users/chris/org/deepstaging/repos/samples/eShop/eShop.slnx
```

**Core Project Files:**
- `/Users/chris/org/deepstaging/repos/samples/eShop/src/eShop.Contracts/eShop.Contracts.csproj`
- `/Users/chris/org/deepstaging/repos/samples/eShop/src/eShop.Catalog/eShop.Catalog.csproj`
- `/Users/chris/org/deepstaging/repos/samples/eShop/src/eShop.Basket/eShop.Basket.csproj`
- `/Users/chris/org/deepstaging/repos/samples/eShop/src/eShop.Ordering/eShop.Ordering.csproj`
- `/Users/chris/org/deepstaging/repos/samples/eShop/src/eShop.Payment/eShop.Payment.csproj`
- `/Users/chris/org/deepstaging/repos/samples/eShop/src/eShop.AppHost/eShop.AppHost.csproj`

**Test Project Files:**
- `/Users/chris/org/deepstaging/repos/samples/eShop/test/eShop.Catalog.Tests/eShop.Catalog.Tests.csproj`
- `/Users/chris/org/deepstaging/repos/samples/eShop/test/eShop.Basket.Tests/eShop.Basket.Tests.csproj`
- `/Users/chris/org/deepstaging/repos/samples/eShop/test/eShop.Ordering.Tests/eShop.Ordering.Tests.csproj`
- `/Users/chris/org/deepstaging/repos/samples/eShop/test/eShop.Payment.Tests/eShop.Payment.Tests.csproj`
- `/Users/chris/org/deepstaging/repos/samples/eShop/test/eShop.Integration.Tests/eShop.Integration.Tests.csproj`
- `/Users/chris/org/deepstaging/repos/samples/eShop/test/eShop.AppHost.Tests/eShop.AppHost.Tests.csproj`

**Sample eShop.Catalog.csproj:**
```xml
<Project Sdk="Microsoft.NET.Sdk">
    <PropertyGroup>
        <TargetFramework>net10.0</TargetFramework>
        <ImplicitUsings>enable</ImplicitUsings>
        <Nullable>enable</Nullable>
        <EmitCompilerGeneratedFiles>false</EmitCompilerGeneratedFiles>
        <CompilerGeneratedFilesOutputPath>generated</CompilerGeneratedFilesOutputPath>
    </PropertyGroup>
    <ItemGroup>
        <Compile Remove="generated/**/*.cs"/>
        <None Include="generated/**/*.cs" LinkBase="generated"/>
    </ItemGroup>
    <ItemGroup>
        <ProjectReference Include="..\eShop.Contracts\eShop.Contracts.csproj"/>
    </ItemGroup>
    <ItemGroup>
        <PackageReference Include="Deepstaging"/>
        <PackageReference Include="Deepstaging.Postgres"/>
    </ItemGroup>
</Project>
```

### Deepstaging Source Generators

**Generator Projects:**
- `/Users/chris/org/deepstaging/repos/deepstaging/src/Core/Deepstaging.Generators/Deepstaging.Generators.csproj` — Core generators (TypedId, DataStore, DispatchModule, etc.)
- `/Users/chris/org/deepstaging/repos/deepstaging/src/Azure/Deepstaging.Azure.Generators/Deepstaging.Azure.Generators.csproj`
- `/Users/chris/org/deepstaging/repos/deepstaging/src/Testing/Deepstaging.Testing.Generators/Deepstaging.Testing.Generators.csproj`
- `/Users/chris/org/deepstaging/repos/deepstaging/src/Infrastructure/Deepstaging.Postgres.Generators/Deepstaging.Postgres.Generators.csproj`
- `/Users/chris/org/deepstaging/repos/deepstaging/src/Infrastructure/Deepstaging.Marten.Generators/Deepstaging.Marten.Generators.csproj`
- `/Users/chris/org/deepstaging/repos/deepstaging/src/Infrastructure/Deepstaging.Supabase.Generators/Deepstaging.Supabase.Generators.csproj`

---

## 4. TUnit Test Examples & Style

**Test Framework:** TUnit (Microsoft Testing Platform)

### Test Base Classes
**Location:** `/Users/chris/org/deepstaging/repos/samples/eShop/test/`

**CatalogTestBase Pattern** (`CatalogTestBase.cs`):
```csharp
public abstract class CatalogTestBase
{
    private TestCatalogRuntime CreateRuntime()
    {
        var runtime = TestCatalogRuntime.Create();
        
        if (TestMode.IsIntegration)
            IntegrationDefaults.Configure(runtime);
        else
            UnitDefaults.Configure(runtime);
        
        return runtime;
    }
    
    protected TestCatalogRuntime CreateRuntime(Func<TestCatalogRuntime, TestCatalogRuntime> configure) =>
        configure(CreateRuntime());
    
    protected CatalogRuntime CreateAppRuntime() =>
        CreateRuntime();
}
```

### Test Example (GetCatalogItemByIdTests.cs)
```csharp
namespace eShop.Catalog.Tests.Domain.Queries;

using Catalog.Domain;

public class GetCatalogItemByIdTests : CatalogTestBase
{
    [Test]
    public async Task GetItemById_ReturnsItem_WhenExists()
    {
        var itemId = CatalogItemId.New();
        
        var item = new CatalogItem
        {
            Id = itemId,
            Name = "Widget",
            Description = "A widget",
            Price = 5.00m,
            AvailableStock = 50,
            CatalogTypeId = CatalogTypeId.New(),
            CatalogBrandId = CatalogBrandId.New()
        };
        
        var store = new InMemoryCatalogItemStore();
        await store.SaveAsync(item);
        
        var runtime = CreateRuntime(r => r.WithCatalogItemStore(store));
        
        var fin = await CatalogDispatch.GetCatalogItemById(itemId)
            .RunAsync(runtime);
        
        await Assert.That(fin).IsSuccMatching(async option => 
        { 
            await Assert.That(option.IsSome).IsTrue(); 
        });
    }
    
    [Test]
    public async Task GetItemById_ReturnsNone_WhenNotFound()
    {
        var runtime = CreateAppRuntime();
        
        var fin = await CatalogDispatch.GetCatalogItemById(CatalogItemId.New())
            .RunAsync(runtime);
        
        await Assert.That(fin).IsSuccMatching(async option => 
        { 
            await Assert.That(option.IsNone).IsTrue(); 
        });
    }
}
```

### GlobalUsings Pattern
```csharp
global using Deepstaging;
global using eShop.Catalog;
global using eShop.Contracts;
global using LanguageExt;
global using static LanguageExt.Prelude;
```

### Key Testing Patterns
- **Test naming:** `MethodName_Expected_When_Condition`
- **Mode awareness:** `TestMode.IsIntegration` for conditional setup
- **Runtime injection:** Via `CreateRuntime()` helper with optional overrides
- **Effect assertions:** Using `IsSuccMatching` or other LanguageExt combinators
- **In-memory stores:** Tests use mock stores before integration tests

---

## 5. Attribute Definitions & API

### 5.1 TypedId Attributes

**File:** `/Users/chris/org/deepstaging/repos/deepstaging/src/Core/Deepstaging.Abstractions/Ids/TypedIdAttribute.cs`

```csharp
[AttributeUsage(AttributeTargets.Struct, AllowMultiple = false, Inherited = false)]
public sealed class TypedIdAttribute : Attribute
{
    /// <summary>
    /// Gets or sets the primitive type used to store the ID value.
    /// Default is <see cref="BackingType.Guid"/>.
    /// </summary>
    public BackingType BackingType { get; set; } = BackingType.Guid;
    
    /// <summary>
    /// Gets or sets which type converters to generate.
    /// Default is <see cref="IdConverters.None"/>.
    /// </summary>
    public IdConverters Converters { get; set; } = IdConverters.None;
    
    /// <summary>
    /// Gets or sets the name of the <see cref="TypedIdProfileAttribute"/> to apply.
    /// When <c>null</c>, the unnamed (default) profile is used if one exists.
    /// </summary>
    public string? Profile { get; set; }
}
```

**Usage Examples from eShop:**
```csharp
// Assembly-level profile (eShop.Contracts.Ids.cs)
[assembly: TypedIdProfile(Converters = IdConverters.EfCoreValueConverter | IdConverters.JsonConverter)]

// Individual TypedIds
[TypedId]
public readonly partial struct CatalogItemId;

[TypedId]
public readonly partial struct CatalogBrandId;

[TypedId(BackingType = BackingType.String)]
public readonly partial struct BuyerId;

[TypedId]
public readonly partial struct OrderId;
```

**Generated Members:**
- `IEquatable<T>` implementation
- `IComparable<T>` implementation
- `IParsable<T>` implementation
- `ToString()` override
- `New()` factory method
- Optional JSON converter
- Optional EF Core value converter
- Equality/comparison operators

### 5.2 TypedIdProfile Attribute

**File:** `/Users/chris/org/deepstaging/repos/deepstaging/src/Core/Deepstaging.Abstractions/Ids/TypedIdProfileAttribute.cs`

```csharp
[AttributeUsage(AttributeTargets.Assembly, AllowMultiple = true)]
public sealed class TypedIdProfileAttribute : Attribute
{
    public string Name { get; }
    public BackingType BackingType { get; set; } = BackingType.Guid;
    public IdConverters Converters { get; set; } = IdConverters.None;
    
    // Unnamed (default) profile
    public TypedIdProfileAttribute() { Name = ""; }
    
    // Named profile
    public TypedIdProfileAttribute(string name) { Name = name; }
}
```

### 5.3 StoredEntity Attribute

**File:** `/Users/chris/org/deepstaging/repos/deepstaging/src/Core/Deepstaging.Abstractions/DataStore/StoredEntityAttribute.cs`

```csharp
[AttributeUsage(AttributeTargets.Class, Inherited = false, AllowMultiple = false)]
public sealed class StoredEntityAttribute : Attribute
{
    /// <summary>
    /// Gets or sets a custom plural name for the entity, used as the nested class name on the data store.
    /// When omitted, the generator appends "s" to the type name (e.g., <c>Article</c> → <c>Articles</c>).
    /// </summary>
    public string? PluralName { get; set; }
}
```

**Usage Examples from eShop:**
```csharp
[StoredEntity]
public partial record CatalogItem
{
    public CatalogItemId Id { get; set; }
    public string Name { get; set; } = "";
    public decimal Price { get; set; }
    [Lookup] public CatalogTypeId CatalogTypeId { get; set; }
    [Lookup] public CatalogBrandId CatalogBrandId { get; set; }
    public int AvailableStock { get; set; }
}

[StoredEntity]
public partial record CustomerBasket
{
    public BuyerId Id { get; init; }
    public List<BasketItem> Items { get; init; } = [];
}
```

**Generated Methods per Entity:**
- `GetByIdAsync<RT>(id, ...) : Eff<RT, Option<T>>`
- `GetByIdsAsync<RT>(ids, ...) : Eff<RT, IReadOnlyList<T>>`
- `SaveAsync<RT>(entity) : Eff<RT, Unit>`
- `SaveManyAsync<RT>(entities) : Eff<RT, Unit>`
- `DeleteAsync<RT>(id) : Eff<RT, Unit>`
- `QueryAsync<RT>(page, pageSize) : Eff<RT, QueryResult<T>>`
- `GetBy{Property}Async<RT>()` for each `[Lookup]` property

### 5.4 DataStore Attribute

**File:** `/Users/chris/org/deepstaging/repos/deepstaging/src/Core/Deepstaging.Abstractions/DataStore/DataStoreAttribute.cs`

```csharp
[AttributeUsage(AttributeTargets.Class, Inherited = false, AllowMultiple = false)]
public sealed class DataStoreAttribute : Attribute
{
    /// <summary>
    /// Gets or sets whether OpenTelemetry instrumentation is enabled.
    /// When <c>true</c> (default), generated effect methods include <c>.WithActivity()</c> calls
    /// that create spans for tracing. Zero overhead when no <c>ActivityListener</c> is registered.
    /// </summary>
    public bool Instrumented { get; init; } = true;
}
```

**Usage from eShop:**
```csharp
[DataStore]
public static partial class CatalogStore;
```

**Generated Structure:**
```
CatalogStore
├── CatalogItems (nested class with CRUD methods)
├── CatalogBrands (nested class)
├── CatalogTypes (nested class)
└── ICatalogStoreCapability (interface for DI)
```

### 5.5 Lookup Attribute

**File:** `/Users/chris/org/deepstaging/repos/deepstaging/src/Core/Deepstaging.Abstractions/DataStore/LookupAttribute.cs`

```csharp
[AttributeUsage(AttributeTargets.Property, Inherited = false, AllowMultiple = false)]
public sealed class LookupAttribute : Attribute;
```

**Usage:**
```csharp
[StoredEntity]
public partial record CatalogItem
{
    public CatalogItemId Id { get; set; }
    [Lookup] public CatalogTypeId CatalogTypeId { get; set; }
    [Lookup] public CatalogBrandId CatalogBrandId { get; set; }
}
```

**Generated Methods:**
- `GetByCatalogTypeIdAsync<RT>(typeId, ...) : Eff<RT, IReadOnlyList<CatalogItem>>`
- `GetByCatalogBrandIdAsync<RT>(brandId, ...) : Eff<RT, IReadOnlyList<CatalogItem>>`

### 5.6 Other Core Attributes

**IntegrationEvent Attribute** (used in eShop.Contracts/IntegrationEvents.cs):
```csharp
[IntegrationEvent("catalog.product-price-changed")]
public sealed record ProductPriceChanged(
    CatalogItemId ItemId,
    decimal OldPrice,
    decimal NewPrice);
```

**Runtime Attribute:**
```csharp
[Runtime]
[Uses(typeof(CatalogStore))]
[Uses(typeof(CatalogIntegrationEvents))]
public partial class CatalogRuntime;
```

**DispatchModule Attribute:**
```csharp
[DispatchModule]
public static partial class CatalogDispatch;
```

**WebApp Attribute:**
```csharp
[WebApp(RoutePrefix = "/api/catalog", Title = "eShop Catalog API")]
public partial class CatalogApp;
```

---

## Key Code Snippets for Documentation

### Strongly-Typed ID Example (eShop.Contracts/Ids.cs)
```csharp
using Deepstaging;
using Deepstaging.Ids;

[assembly: TypedIdProfile(Converters = IdConverters.EfCoreValueConverter | IdConverters.JsonConverter)]

namespace eShop.Contracts;

[TypedId]
public readonly partial struct CatalogItemId;

[TypedId]
public readonly partial struct CatalogBrandId;

[TypedId(BackingType = BackingType.String)]
public readonly partial struct BuyerId;

[TypedId]
public readonly partial struct OrderId;
```

### Stored Entity Example (CatalogItem.cs)
```csharp
[StoredEntity]
public partial record CatalogItem
{
    public CatalogItemId Id { get; set; }
    [MaxLength(256)] public string Name { get; set; } = "";
    [MaxLength(2048)] public string Description { get; set; } = "";
    public decimal Price { get; set; }
    [MaxLength(256)] public string PictureFileName { get; set; } = "";
    [Lookup] public CatalogTypeId CatalogTypeId { get; set; }
    [Lookup] public CatalogBrandId CatalogBrandId { get; set; }
    public int AvailableStock { get; set; }
    public int RestockThreshold { get; set; }
    public int MaxStockThreshold { get; set; }
    public bool OnReorder { get; set; }
}
```

### Runtime Setup Example (Runtime.cs)
```csharp
[Runtime]
[Uses(typeof(CatalogStore))]
[Uses(typeof(CatalogIntegrationEvents))]
public partial class CatalogRuntime;

[DataStore]
public static partial class CatalogStore;

[EventQueue("CatalogIntegrationEvents")]
public static partial class CatalogIntegrationEvents;

[DispatchModule]
public static partial class CatalogDispatch;

[WebApp(RoutePrefix = "/api/catalog", Title = "eShop Catalog API")]
public partial class CatalogApp;
```

### Command Handler Example (DeductOrderStock.cs)
```csharp
public sealed record DeductOrderStock(OrderId OrderId, IReadOnlyList<OrderStockItem> Items) : ICommand;

public static class DeductOrderStockHandler
{
    [CommandHandler]
    public static Eff<CatalogRuntime, Unit> Handle(DeductOrderStock cmd) =>
        from items in CatalogItems.GetByIds<CatalogRuntime>(cmd.Items.Select(i => i.ItemId))
        from _ in Mutate<CatalogRuntime>(() => DeductAvailableStocks(cmd, items))
                  >> CatalogItems.SaveMany<CatalogRuntime>(items)
        select unit;
    
    private static void DeductAvailableStocks(DeductOrderStock cmd, IReadOnlyList<CatalogItem> items)
    {
        var itemMap = items.ToDictionary(ci => ci.Id);
        foreach (var orderItem in cmd.Items)
            if (itemMap.TryGetValue(orderItem.ItemId, out var ci))
                ci.AvailableStock -= orderItem.Units;
    }
}
```

### Query Handler Example (GetCatalogItems.cs)
```csharp
public sealed record GetCatalogItems(int Page = 1, int PageSize = 10) : IQuery;

public static class GetCatalogItemsHandler
{
    [QueryHandler, HttpGet("/items")]
    public static Eff<CatalogRuntime, QueryResult<CatalogItem>> Handle(GetCatalogItems query) =>
        CatalogStore.CatalogItems.Query<CatalogRuntime>(query.Page, query.PageSize);
}
```

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| eShop bounded contexts | 4 (Catalog, Basket, Ordering, Payment) |
| Total eShop source files | ~55 files (src) |
| Guide chapters | 10 (index + 9 chapters) |
| Total guide size | ~100 KB |
| Deepstaging generators | 6 (Core, Azure, Testing, Postgres, Marten, Supabase) |
| Core attributes | 40+ (IDs, DataStore, Effects, Dispatch, Web, EventStore, etc.) |
| Test projects | 6 (Catalog, Basket, Ordering, Payment, Integration, AppHost) |
| TUnit test classes | 20+ across all test projects |

---

## Documentation Gaps & Opportunities

### What's Documented
✅ Project setup (Chapter 1)
✅ Effects & runtime (Chapter 2)
✅ Commands & queries (Chapter 3)
✅ Web APIs (Chapter 4)
✅ Integration events (Chapter 6)
✅ Infrastructure & Aspire (Chapter 8)
✅ Integration testing (Chapter 9)

### Potential Additions for eShop Setup Chapter
- Owned collections (BasketItem inside CustomerBasket)
- Multi-bounded context communication patterns
- State machines (Order lifecycle)
- Background jobs (Grace period in Ordering)
- Test modes and integration vs unit test patterns
- Generated test runtime classes (TestCatalogRuntime)
