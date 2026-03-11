# eShop Architecture & Documentation Guide

## Project Architecture Overview

```
┌────────────────────────────────────────────────────────────────────┐
│                        eShop Multi-Context                          │
│                                                                     │
│  ┌──────────────┐   Integration Events   ┌──────────────┐          │
│  │   Catalog    │◄──────────────────────►│   Basket     │          │
│  │  (Inventory) │      (via EventQueue)  │  (Shopping)  │          │
│  └──────────────┘                        └──────────────┘          │
│        │                                         │                  │
│        │                                         │                  │
│  Integration Events                    Integration Events          │
│        │                                         │                  │
│        └─────────────────┬──────────────────────┘                  │
│                          │                                          │
│                   ┌──────▼──────┐                                  │
│                   │  Ordering   │                                  │
│                   │  (Orders)   │                                  │
│                   └──────┬──────┘                                  │
│                          │                                          │
│                   Integration Events                               │
│                          │                                          │
│                   ┌──────▼──────┐                                  │
│                   │  Payment    │                                  │
│                   │ (Payments)  │                                  │
│                   └─────────────┘                                  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────┐         │
│  │  eShop.Contracts (Shared)                            │         │
│  │  ├─ Strongly-Typed IDs                              │         │
│  │  ├─ Integration Events                              │         │
│  │  └─ Value Objects (OrderStockItem, etc.)            │         │
│  └──────────────────────────────────────────────────────┘         │
└────────────────────────────────────────────────────────────────────┘
```

## Bounded Context Structure

Each bounded context (Catalog, Basket, Ordering, Payment) follows this structure:

```
eShop.Catalog/
├── Domain/
│   ├── CatalogItem.cs         # [StoredEntity] main aggregate
│   ├── CatalogBrand.cs        # [StoredEntity] reference entity
│   ├── CatalogType.cs         # [StoredEntity] reference entity
│   ├── Commands/              # All commands for domain logic
│   │   ├── ConfirmOrderStock.cs
│   │   ├── DeductOrderStock.cs
│   │   └── UpdateCatalogItemPrice.cs
│   ├── Queries/               # All queries for reading
│   │   ├── GetCatalogItems.cs
│   │   ├── GetCatalogItemById.cs
│   │   ├── GetCatalogBrands.cs
│   │   └── GetCatalogTypes.cs
│   └── (no handlers here - see below)
├── Runtime.cs                 # [Runtime], [DataStore], [EventQueue], [DispatchModule], [WebApp]
├── Handlers/                  # [CommandHandler] and [QueryHandler] implementations
│   ├── CatalogIntegrationEventHandlers.cs  # Handles incoming events
│   └── (command/query handlers via [CommandHandler]/[QueryHandler] attributes)
├── GlobalUsings.cs            # Using statements for whole assembly
├── Config.cs                  # Configuration
└── eShop.Catalog.csproj

eShop.Catalog.Tests/
├── CatalogTestBase.cs         # Base class with mode-aware runtime creation
├── Domain/
│   ├── Commands/
│   │   └── *Tests.cs
│   └── Queries/
│       └── *Tests.cs
├── IntegrationSetup.cs        # Configure for integration tests
├── UnitDefaults.cs            # Configure for unit tests
├── TestRuntime.cs             # Generated - TestCatalogRuntime
└── GlobalUsings.cs
```

## Deepstaging Generation Pipeline

### 1. TypedId Generation
**Input:**
```csharp
[TypedId]
public readonly partial struct CatalogItemId;
```

**Generated:**
```csharp
public partial struct CatalogItemId
{
    private Guid _value;
    
    public static CatalogItemId New() => new() { _value = Guid.NewGuid() };
    
    public override bool Equals(object? obj) => ...;
    public override int GetHashCode() => _value.GetHashCode();
    public override string ToString() => _value.ToString();
    
    public static bool operator ==(CatalogItemId left, CatalogItemId right) => ...;
    public static bool operator !=(CatalogItemId left, CatalogItemId right) => ...;
    public static bool TryParse(string? s, ...) => ...;
    
    // Optional converters (JsonConverter, EfCoreValueConverter)
}
```

### 2. StoredEntity Generation
**Input:**
```csharp
[StoredEntity]
public partial record CatalogItem
{
    public CatalogItemId Id { get; set; }
    public string Name { get; set; } = "";
    [Lookup] public CatalogTypeId CatalogTypeId { get; set; }
}
```

**Generated:**
```csharp
// Generated on DataStore
public static class CatalogItems
{
    public static Eff<RT, Option<CatalogItem>> GetByIdAsync<RT>(
        CatalogItemId id) where RT : ICatalogStoreCapability, ...;
    
    public static Eff<RT, IReadOnlyList<CatalogItem>> GetByIdsAsync<RT>(
        IEnumerable<CatalogItemId> ids) where RT : ICatalogStoreCapability, ...;
    
    public static Eff<RT, Unit> SaveAsync<RT>(
        CatalogItem entity) where RT : ICatalogStoreCapability, ...;
    
    public static Eff<RT, Unit> SaveManyAsync<RT>(
        IEnumerable<CatalogItem> entities) where RT : ICatalogStoreCapability, ...;
    
    public static Eff<RT, Unit> DeleteAsync<RT>(
        CatalogItemId id) where RT : ICatalogStoreCapability, ...;
    
    public static Eff<RT, QueryResult<CatalogItem>> QueryAsync<RT>(
        int page = 1, int pageSize = 10) where RT : ICatalogStoreCapability, ...;
    
    // Generated for [Lookup] property
    public static Eff<RT, IReadOnlyList<CatalogItem>> GetByCatalogTypeIdAsync<RT>(
        CatalogTypeId catalogTypeId) where RT : ICatalogStoreCapability, ...;
}
```

### 3. DataStore Generation
**Input:**
```csharp
[DataStore]
public static partial class CatalogStore;
```

**Generated:**
```csharp
public static partial class CatalogStore
{
    public static class CatalogItems { /* methods */ }
    public static class CatalogBrands { /* methods */ }
    public static class CatalogTypes { /* methods */ }
    
    public interface ICatalogStoreCapability
    {
        // Methods for each entity store
        Eff<unit> CatalogItems_GetByIdAsync(CatalogItemId id);
        // ... all CRUD and lookup methods
    }
}
```

### 4. CommandHandler/QueryHandler Generation
**Input:**
```csharp
[CommandHandler]
public static Eff<CatalogRuntime, Unit> Handle(DeductOrderStock cmd) => ...;

[QueryHandler]
public static Eff<CatalogRuntime, QueryResult<CatalogItem>> Handle(GetCatalogItems query) => ...;
```

**Generated:** (via DispatchModule)
```csharp
public static partial class CatalogDispatch
{
    public static Eff<CatalogRuntime, Unit> DeductOrderStock(
        OrderId orderId, IReadOnlyList<OrderStockItem> items) => ...;
    
    public static Eff<CatalogRuntime, QueryResult<CatalogItem>> GetCatalogItems(
        int page = 1, int pageSize = 10) => ...;
}
```

### 5. Runtime Generation
**Input:**
```csharp
[Runtime]
[Uses(typeof(CatalogStore))]
[Uses(typeof(CatalogIntegrationEvents))]
public partial class CatalogRuntime;
```

**Generated:**
```csharp
public partial class CatalogRuntime 
    : ICatalogStoreCapability, 
      ICatalogIntegrationEventsCapability
{
    // Implementations of all capability interfaces
    // Composition of all effects from [Uses] types
}
```

## Data Flow Example: Deduct Stock

```
User Action: Payment Succeeds
    │
    ├─ OrderPaymentSucceeded event published
    │   (from Payment context)
    │
    ├─ CatalogIntegrationEventHandlers receives event
    │   │
    │   └─ Dispatches: CatalogDispatch.DeductOrderStock(...)
    │       │
    │       └─ Calls: DeductOrderStockHandler.Handle(cmd)
    │           │
    │           ├─ CatalogItems.GetByIds<RT>(itemIds)  [Effect]
    │           │   │
    │           │   └─ Returns: IReadOnlyList<CatalogItem>
    │           │
    │           ├─ Mutate(() => DeductAvailableStocks(...))  [Effect]
    │           │   │
    │           │   └─ Modifies: item.AvailableStock -= quantity
    │           │
    │           └─ CatalogItems.SaveMany<RT>(items)  [Effect]
    │               │
    │               └─ Persists: Updated items
    │
    └─ OrderStatusChangedToPaid event sent to other contexts
```

## Test Execution Flow

```
TUnit Test Method
│
├─ SetUp: Creates TestCatalogRuntime (generated)
│
├─ if TestMode.IsIntegration
│   └─ IntegrationDefaults.Configure(runtime)
│       └─ Connects to real PostgreSQL database
│
├─ else
│   └─ UnitDefaults.Configure(runtime)
│       └─ Uses in-memory stores (InMemoryCatalogItemStore)
│
├─ Execute: Calls effect (e.g., CatalogDispatch.GetCatalogItemById)
│   │
│   └─ .RunAsync(runtime)
│
├─ Assert: Uses LanguageExt + TUnit assertions
│   │
│   └─ .IsSuccMatching(async option => ...)
│
└─ TearDown: Automatic cleanup
```

## File-by-File Documentation Guide

### eShop.Contracts/Ids.cs
**What to document:**
- Assembly-level TypedIdProfile attribute
- Multiple [TypedId] structs with different BackingType
- Profile configuration (Converters)
- Generated capabilities

**Key learning points:**
- Guid vs String-backed IDs (CatalogItemId vs BuyerId)
- Profile inheritance
- Converter composition

### eShop.Contracts/IntegrationEvents.cs
**What to document:**
- [IntegrationEvent] attribute with message key
- Records as event types
- Cross-context communication patterns
- Event versioning potential

**Key learning points:**
- Event naming conventions
- Event composition (multiple IDs in one event)
- Immutable records
- Integration event vs domain event

### eShop.Catalog/Domain/CatalogItem.cs
**What to document:**
- [StoredEntity] attribute on record
- Property annotations (MaxLength)
- [Lookup] properties for queries
- Aggregates and value objects

**Key learning points:**
- Record patterns for immutability
- Validation annotations
- Lookup relationships
- Owned value objects (not shown in CatalogItem, but in BasketItem)

### eShop.Catalog/Runtime.cs
**What to document:**
- [Runtime], [DataStore], [EventQueue], [DispatchModule], [WebApp] attributes
- [Uses] for composition
- Partial class pattern
- Generated code scope

**Key learning points:**
- Runtime as composition root
- Capability injection via [Uses]
- Code generation structure
- Aspire/WebApp setup

### eShop.Catalog/Domain/Commands/DeductOrderStock.cs
**What to document:**
- Command record (ICommand)
- [CommandHandler] attribute
- Eff<RT, T> monadic composition
- Effect combinators (from/select, >>, etc.)
- Store method calls

**Key learning points:**
- Commands express intent
- Handler pure functions
- Effect monads chain operations
- Error handling via Result
- Mutation captured in effects

### eShop.Catalog/Domain/Queries/GetCatalogItems.cs
**What to document:**
- Query record (IQuery) with pagination
- [QueryHandler] attribute
- [HttpGet] for web mapping
- QueryResult<T> type
- Effect return type

**Key learning points:**
- Queries are read-only
- Pagination pattern
- Integration with web layer
- Store query methods

### eShop.Catalog.Tests/CatalogTestBase.cs
**What to document:**
- TestMode awareness (IsIntegration)
- Mode-based runtime configuration
- Default factory pattern
- Test fixture composition

**Key learning points:**
- Mode-aware tests
- IntegrationDefaults vs UnitDefaults
- Runtime overrides for specific scenarios
- Test fixture patterns

### eShop.Catalog.Tests/Domain/Queries/GetCatalogItemByIdTests.cs
**What to document:**
- [Test] attribute (TUnit)
- Async/await patterns
- In-memory store injection
- Effect execution (.RunAsync)
- TUnit assertion style

**Key learning points:**
- TUnit test structure
- Arrange/Act/Assert
- Effect test execution
- Option/Result assertions

---

## Commands vs Queries Mapping

| Aspect | Command | Query |
|--------|---------|-------|
| **Intent** | Change state | Read state |
| **Return Type** | `Eff<RT, Unit>` or `Eff<RT, Result>` | `Eff<RT, QueryResult<T>>` or `Eff<RT, Option<T>>` |
| **Side Effects** | Yes (via store.Save) | No |
| **Decorator** | `[CommandHandler]` | `[QueryHandler]` |
| **Example** | UpdateCatalogItemPrice | GetCatalogItems |
| **Web Mapping** | HttpPost, HttpPut | HttpGet |

---

## Integration Event Flow

```
┌────────────────┐
│  Catalog       │
│  Aggregate     │
│  (CatalogItem) │
└────────────────┘
         │
         │ Price changes
         │
    ┌────▼─────────────────────┐
    │ Handler publishes:       │
    │ ProductPriceChanged      │
    │ (OrderStatusChangedTo...) │
    │ (OrderStockConfirmed)    │
    │ (OrderStockRejected)     │
    └────┬─────────────────────┘
         │
         │ (via EventQueue)
         │
    ┌────▼──────────────────────────────────────┐
    │ eShop.Contracts/IntegrationEvents.cs      │
    │ Contains records:                         │
    │ - ProductPriceChanged                    │
    │ - OrderStockConfirmed                    │
    │ - OrderStockRejected                     │
    │ - etc.                                   │
    └────┬──────────────────────────────────────┘
         │
    ┌────▼──────────────────────────────────────┐
    │ Other Contexts consume:                   │
    │ - Basket.Handlers -> ProductPriceChanged  │
    │ - Ordering.Handlers -> OrderStatusChanged │
    │ - Payment.Handlers -> OrderStatusChanged  │
    │ etc.                                      │
    └───────────────────────────────────────────┘
```

---

## Package Dependencies

### Core Packages
- `Deepstaging` — Core runtime, generators, attributes
- `Deepstaging.Postgres` — PostgreSQL integration
- `Deepstaging.Testing` — Test generators, TestRuntime
- `Deepstaging.EventQueue` — Integration events
- `TUnit` — Test framework (not Deepstaging-specific)
- `Verify` — Snapshot testing
- `LanguageExt` — Functional programming (Option, Result, effects)
- `Microsoft.Extensions.Hosting` — Aspire/DI

### Development Packages
- `Microsoft.NET.Test.Sdk` — Test SDK
- `Testcontainers` — For integration tests with real DB
- `Testcontainers.PostgreSql` — PostgreSQL test containers

---

## Documentation Chapter Mapping

| Chapter | Focus | Key Files |
|---------|-------|-----------|
| 1: Project Setup | TypedId, StoredEntity, DataStore | Ids.cs, CatalogItem.cs, Runtime.cs |
| 2: Effects & Runtime | [Runtime], Eff<RT,T>, composition | Runtime.cs, GlobalUsings.cs |
| 3: Commands & Queries | CQRS, dispatch | Commands/*.cs, Queries/*.cs, DispatchModule |
| 4: Web API | [WebApp], endpoints | [HttpGet] attributes, [WebApp] |
| 5: Basket Context | Second bounded context | CustomerBasket.cs, owned collections |
| 6: Event-Driven | IntegrationEvents, EventQueue | IntegrationEvents.cs, Handlers |
| 7: Ordering/Payment | State machines, jobs | Order.cs, GracePeriodJob.cs |
| 8: Infrastructure | Aspire, BYOC, Service Bus | Config.cs, AppHost |
| 9: Integration Testing | E2E flows, modes | Integration.Tests/Flows/*.cs |

---

## Common Patterns to Show

### 1. Lookup Pattern
```csharp
[StoredEntity]
public partial record CatalogItem
{
    [Lookup] public CatalogTypeId CatalogTypeId { get; set; }
}
// Generates: GetByCatalogTypeIdAsync(typeId)
```

### 2. Owned Collections Pattern
```csharp
[StoredEntity]
public partial record CustomerBasket
{
    public List<BasketItem> Items { get; init; } = [];
}
// BasketItem is not [StoredEntity], just a nested record
```

### 3. Effect Composition Pattern
```csharp
from items in Store.GetByIds<RT>(ids)
from _ in Mutate<RT>(() => MutateLogic(items))
        >> Store.SaveMany<RT>(items)
select unit;
```

### 4. Test Mode Awareness Pattern
```csharp
if (TestMode.IsIntegration)
    IntegrationDefaults.Configure(runtime);
else
    UnitDefaults.Configure(runtime);
```

### 5. Runtime Injection Pattern
```csharp
var fin = await CatalogDispatch.GetCatalogItemById(id)
    .RunAsync(runtime);
```

---

## Key Takeaways for Documentation

1. **Contracts First** — shared IDs and events in separate assembly
2. **Bounded Contexts** — no direct project references between contexts
3. **Types Express Intent** — commands vs queries vs integration events
4. **Code Generation** — attributes transform partial declarations
5. **Effects Composition** — monadic binding chains operations
6. **Mode-Aware Tests** — single test code, dual execution paths
7. **Event-Driven** — cross-context communication via immutable events
8. **Functional Style** — LanguageExt effects + immutable records

