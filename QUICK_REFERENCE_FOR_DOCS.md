# Quick Reference for eShop Documentation Writing

## File Paths for Your Documentation Chapter

### Core Source Files to Reference
```
eShop Contracts:           /Users/chris/org/deepstaging/repos/samples/eShop/src/eShop.Contracts/
  ├─ Ids.cs               # TypedId definitions [TypedId] attributes
  └─ IntegrationEvents.cs # [IntegrationEvent] records

eShop Catalog:             /Users/chris/org/deepstaging/repos/samples/eShop/src/eShop.Catalog/
  ├─ Domain/CatalogItem.cs        # [StoredEntity] main entity
  ├─ Domain/Commands/              # [CommandHandler] decorated classes
  ├─ Domain/Queries/               # [QueryHandler] decorated classes  
  └─ Runtime.cs                     # Runtime, DataStore, EventQueue, DispatchModule, WebApp setup

eShop Basket:              /Users/chris/org/deepstaging/repos/samples/eShop/src/eShop.Basket/
  └─ Domain/CustomerBasket.cs     # [StoredEntity] with owned collections
```

### Test Files to Reference
```
eShop.Catalog.Tests:       /Users/chris/org/deepstaging/repos/samples/eShop/test/eShop.Catalog.Tests/
  ├─ CatalogTestBase.cs                   # Base test class pattern
  ├─ Domain/Queries/GetCatalogItemByIdTests.cs  # TUnit test example
  ├─ IntegrationSetup.cs                  # Integration test config
  ├─ UnitDefaults.cs                      # Unit test config
  └─ TestRuntime.cs                       # Generated test runtime
```

### Attribute Definitions
```
TypedIdAttribute:      /Users/chris/org/deepstaging/repos/deepstaging/src/Core/Deepstaging.Abstractions/Ids/TypedIdAttribute.cs
TypedIdProfileAttribute: /Users/chris/org/deepstaging/repos/deepstaging/src/Core/Deepstaging.Abstractions/Ids/TypedIdProfileAttribute.cs
StoredEntityAttribute:    /Users/chris/org/deepstaging/repos/deepstaging/src/Core/Deepstaging.Abstractions/DataStore/StoredEntityAttribute.cs
DataStoreAttribute:       /Users/chris/org/deepstaging/repos/deepstaging/src/Core/Deepstaging.Abstractions/DataStore/DataStoreAttribute.cs
LookupAttribute:          /Users/chris/org/deepstaging/repos/deepstaging/src/Core/Deepstaging.Abstractions/DataStore/LookupAttribute.cs
```

### Existing Guide Examples
```
Chapter 1 (Project Setup):      /Users/chris/org/deepstaging/repos/deepstaging/docs/guide/project-setup.md
Chapter 3 (Commands & Queries): /Users/chris/org/deepstaging/repos/deepstaging/docs/guide/commands-and-queries.md
Guide Index:                     /Users/chris/org/deepstaging/repos/deepstaging/docs/guide/index.md
mkdocs.yml:                      /Users/chris/org/deepstaging/repos/deepstaging/mkdocs.yml
```

---

## Key APIs for Documentation

### [TypedId] Attribute
```csharp
[TypedId(BackingType = BackingType.{Guid|String|Int|Long}, 
          Converters = IdConverters.{JsonConverter|EfCoreValueConverter}, 
          Profile = "profile-name")]
public readonly partial struct IdName;
```
**Generates:** IEquatable, IComparable, IParsable, ToString(), New(), optional converters

### [TypedIdProfile] Attribute (Assembly-level)
```csharp
[assembly: TypedIdProfile(Converters = IdConverters.EfCoreValueConverter | IdConverters.JsonConverter)]
[assembly: TypedIdProfile("named-profile", BackingType = BackingType.String, Converters = ...)]
```
**Purpose:** Define converter/backing-type defaults for all [TypedId] structs in assembly

### [StoredEntity] Attribute
```csharp
[StoredEntity(PluralName = "CustomPlural")]
public partial record EntityName
{
    public EntityIdType Id { get; set; }
    [Lookup] public ForeignKeyId LookupProp { get; set; }
}
```
**Generates:** GetByIdAsync, SaveAsync, SaveManyAsync, DeleteAsync, QueryAsync, GetBy{Property}Async for [Lookup]

### [DataStore] Attribute
```csharp
[DataStore(Instrumented = true)]
public static partial class StoreName;
```
**Generates:** Nested classes for each [StoredEntity], IStoreCapability interface

### [Lookup] Attribute (Property-level)
```csharp
[StoredEntity]
public partial record Item
{
    [Lookup] public CategoryId CategoryId { get; set; }
}
```
**Generates:** GetByCategoryIdAsync method on store

### [Runtime] Attribute
```csharp
[Runtime]
[Uses(typeof(StoreName))]
[Uses(typeof(EventQueueName))]
public partial class RuntimeName;
```

### [CommandHandler] / [QueryHandler] Attributes
```csharp
public static class HandlerName
{
    [CommandHandler]
    public static Eff<Runtime, Result> Handle(CommandType cmd) => ...;
    
    [QueryHandler]
    public static Eff<Runtime, QueryResult<T>> Handle(QueryType query) => ...;
}
```

### [IntegrationEvent] Attribute
```csharp
[IntegrationEvent("event.key")]
public sealed record EventName(/* properties */);
```

---

## Documentation Patterns from Existing Chapters

### Standard Structure for Each Section
1. **Problem/Goal Statement**
   - What problem does this solve?
   - What will we achieve?

2. **Conceptual Explanation**
   - Brief prose explaining the pattern
   - When/why to use it

3. **Code Example**
   - Inline with ```csharp title="Path/File.cs"
   - Focused, runnable snippet
   - Usually 10-30 lines

4. **What Gets Generated**
   - Callout box: !!! note "Generated Code"
   - List of methods/classes created
   - How to use them

5. **Test Example**
   - Show how to test this feature
   - Use TUnit with [Test] attribute
   - Include assertion patterns

6. **Next Steps / Connections**
   - Link to module docs
   - Reference other chapters
   - Bridge to next topic

### Code Example Format
```markdown
\`\`\`csharp title="Namespace/File.cs"
using Required.Namespaces;

namespace YourNamespace;

[Attribute]
public class Example { }
\`\`\`
```

### Callout Format
```markdown
!!! note "Note Title"
    Multi-line content here.
    
    Second paragraph with details.
```

### Test Example Format
```markdown
\`\`\`csharp title="Tests/YourTest.cs"
public class YourTest : BaseTest
{
    [Test]
    public async Task Method_Does_What_When_Condition()
    {
        var input = CreateInput();
        var result = await method.RunAsync(runtime);
        await Assert.That(result).IsSuccMatching(/* assertion */);
    }
}
\`\`\`
```

---

## Data to Include in eShop Setup Chapter

### IDs to Show
- CatalogItemId, CatalogBrandId, CatalogTypeId (Guid-backed)
- BuyerId (String-backed)
- OrderId (Guid-backed)

### Entities to Show
- CatalogItem (multiple [Lookup] properties, domain logic)
- CustomerBasket (with owned collection - BasketItem)
- CatalogBrand, CatalogType (simple reference entities)

### Stores to Show
- CatalogStore (generated from 3 entities)
- BasketStore (generated from 1 entity with collection)

### Commands/Queries to Show
- DeductOrderStock (complex command with side effects)
- GetCatalogItems (query with pagination)
- UpdateBasket (command)

### Integration Events to Show
- ProductPriceChanged (catalog → basket)
- OrderStockConfirmed (catalog → ordering)
- UserCheckoutAccepted (basket → ordering)

### Test Patterns to Show
- CatalogTestBase (mode-aware runtime creation)
- GetCatalogItemByIdTests (query test with mocked store)
- Integration vs unit test defaults

---

## Writing Checklist

- [ ] Reference actual eShop code with file paths
- [ ] Include attribute definitions inline or linked
- [ ] Show generated code in callout boxes
- [ ] Provide TUnit test examples
- [ ] Link to module docs (ids, datastore, dispatch, etc.)
- [ ] Use existing guide chapters as style reference
- [ ] Include both entity and value object patterns
- [ ] Show lookup properties and their generated methods
- [ ] Include owned collection example (BasketItem)
- [ ] Cross-reference integration events (next chapter)
- [ ] Mention TestMode awareness for tests
- [ ] Include GlobalUsings pattern
- [ ] Show runtime composition with [Uses] attributes
