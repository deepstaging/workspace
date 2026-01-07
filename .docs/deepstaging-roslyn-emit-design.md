# Deepstaging.Roslyn.Emit - Design Document

**Status**: Hypothetical Design / Brainstorming  
**Date**: 2026-01-07  
**Context**: Writing API to complement the excellent Deepstaging.Roslyn reading API

---

## Overview

Deepstaging.Roslyn provides an excellent fluent API for **reading** Roslyn types. This document explores a complementary API for **writing** code using Roslyn's SyntaxFactory, following the same design principles.

### Design Goals

1. **Fluent, chainable builders** - Similar to `TypeQuery`
2. **ValidSymbol/Optional pattern** - Type-safe projections
3. **Escape hatch via `.Custom()`** - For complex scenarios
4. **Intention-revealing names** - `WithModifier()`, `AddMethod()`, etc.
5. **Immutable builders** - Each call returns new instance
6. **Common cases trivial** - 80/20 rule: properties, methods, constructors

---

## API Surface

### Basic Usage

```csharp
// Start with a type builder
var classDecl = TypeBuilder
    .Class("Customer")
    .WithAccessibility(Accessibility.Public)
    .WithModifiers(Modifier.Partial)
    .InNamespace("MyApp.Domain");

// Add properties (most common scenario)
classDecl = classDecl
    .AddProperty("Id", "Guid")
        .WithAccessibility(Accessibility.Public)
        .WithAutoPropertyAccessors()
    .AddProperty("Name", "string")
        .WithAccessibility(Accessibility.Public)
        .WithAutoPropertyAccessors()
        .AsNullable()
    .AddProperty("CreatedAt", "DateTime")
        .WithAccessibility(Accessibility.Public)
        .WithAutoPropertyAccessors();

// Add methods
classDecl = classDecl
    .AddMethod("UpdateName")
        .WithAccessibility(Accessibility.Public)
        .WithReturnType("void")
        .AddParameter("newName", "string")
        .WithBody(body => body
            .AddStatement("Name = newName")
            .AddStatement("UpdatedAt = DateTime.UtcNow"));

// Emit to syntax
CompilationUnitSyntax unit = classDecl.ToCompilationUnit();

// Or emit to string
string code = classDecl.ToCode();
```

---

## Project Structure

```
Deepstaging.Roslyn.Emit/
├── TypeBuilder.cs              # Main entry point
├── PropertyBuilder.cs          # Property-specific
├── MethodBuilder.cs            # Method-specific
├── ConstructorBuilder.cs       # Constructor-specific
├── FieldBuilder.cs             # Field-specific
├── ParameterBuilder.cs         # Parameter configuration
├── BodyBuilder.cs              # Method/ctor body statements
├── ExpressionBuilder.cs        # Expression building
├── Modifiers.cs                # Enum: Public, Private, Static, etc.
├── EmitOptions.cs              # Formatting and validation options
├── EmitResult.cs               # Result with diagnostics
├── Extensions/
│   ├── TypeBuilder.Properties.cs
│   ├── TypeBuilder.Methods.cs
│   ├── TypeBuilder.Constructors.cs
│   └── BodyBuilder.Statements.cs
└── Projections/
    └── EmittedType.cs          # Result wrapper with syntax + code
```

---

## Feature Deep Dives

### 1. Full Expression Support in Body Building

```csharp
// Statement-level (simple)
.WithBody(b => b
    .AddStatement("var x = 5")
    .AddReturn("x * 2"))

// Expression-level (fluent)
.WithBody(b => b
    .DeclareVariable("x", "int", init => init.Literal(5))
    .AddReturn(ret => ret.Binary(
        left => left.Identifier("x"),
        BinaryOperator.Multiply,
        right => right.Literal(2))))

// Mixed approach (practical)
.WithBody(b => b
    .AddIf(
        condition: c => c.Invocation("string.IsNullOrEmpty", "Name"),
        then: t => t.Throw("ArgumentException", "Name cannot be empty"))
    .DeclareVariable("result", "var", 
        init => init.Await(a => a.Invocation("_service.ProcessAsync", "Name")))
    .AddReturn("result"))

// Escape hatch
.WithBody(b => b.AddCustom(
    SyntaxFactory.ThrowStatement(...)))
```

#### Expression Builder API

```csharp
public readonly struct ExpressionBuilder
{
    public ExpressionSyntax Literal(object value);
    public ExpressionSyntax Identifier(string name);
    public ExpressionSyntax Invocation(string method, params string[] args);
    public ExpressionSyntax Await(Func<ExpressionBuilder, ExpressionSyntax> expr);
    public ExpressionSyntax Binary(
        Func<ExpressionBuilder, ExpressionSyntax> left,
        BinaryOperator op,
        Func<ExpressionBuilder, ExpressionSyntax> right);
    public ExpressionSyntax MemberAccess(string expression, string member);
    public ExpressionSyntax ObjectCreation(string type, params string[] args);
    public ExpressionSyntax CollectionExpression(params ExpressionSyntax[] elements);
    
    // Escape hatch
    public ExpressionSyntax Custom(ExpressionSyntax syntax);
}
```

---

### 2. Dual Type Reference Support

```csharp
// String-based (simple, common)
.AddProperty("Items", "List<string>")
.AddMethod("Process")
    .WithReturnType("Task<bool>")
    .AddParameter("value", "int?")

// Symbol-based (when you have compilation context)
.AddProperty("Items", listOfString) // INamedTypeSymbol
.AddMethod("Process")
    .WithReturnType(taskOfBool)
    .AddParameter("value", nullableInt)

// Mixed (practical)
.AddProperty("UserId", "Guid")
.AddProperty("User", userSymbol)
```

#### Internal Type Reference Abstraction

```csharp
public interface ITypeReference
{
    TypeSyntax ToTypeSyntax();
    string ToTypeString();
}

public class StringTypeReference : ITypeReference 
{ 
    private readonly string _typeString;
    
    public StringTypeReference(string typeString) => _typeString = typeString;
    
    public TypeSyntax ToTypeSyntax() => SyntaxFactory.ParseTypeName(_typeString);
    public string ToTypeString() => _typeString;
}

public class SymbolTypeReference : ITypeReference 
{ 
    private readonly ITypeSymbol _symbol;
    
    public SymbolTypeReference(ITypeSymbol symbol) => _symbol = symbol;
    
    public TypeSyntax ToTypeSyntax() => _symbol.ToTypeSyntax();
    public string ToTypeString() => _symbol.ToDisplayString();
}
```

---

### 3. Automatic Namespace Imports

```csharp
var classBuilder = TypeBuilder
    .Class("CustomerService")
    .InNamespace("MyApp.Services")
    .AddUsing("System")
    .AddUsing("System.Collections.Generic")
    .AddUsing("System.Threading.Tasks");

// Auto-infer from type references
var classBuilder = TypeBuilder
    .Class("CustomerService")
    .InNamespace("MyApp.Services")
    .WithAutoImports() // Analyzes all type refs and adds usings
    .AddProperty("Logger", "ILogger<CustomerService>") // Adds Microsoft.Extensions.Logging
    .AddMethod("GetAsync")
        .WithReturnType("Task<Customer>"); // Adds System.Threading.Tasks

// Manual + auto
var classBuilder = TypeBuilder
    .Class("CustomerService")
    .InNamespace("MyApp.Services")
    .AddUsing("System") // Always include
    .WithAutoImports() // Plus inferred
    .AddProperty("Items", "List<string>");
```

#### Import Options

```csharp
public class ImportOptions
{
    public bool AutoInfer { get; set; } = true;
    public bool IncludeSystemByDefault { get; set; } = true;
    public bool OrganizeImports { get; set; } = true; // Alphabetical
    public HashSet<string> ExcludeNamespaces { get; set; } = [];
}
```

---

### 4. Formatting Options

Based on existing Roslyn formatting capabilities:

```csharp
var emitOptions = new EmitOptions
{
    // Roslyn formatting
    UseRoslynFormatter = true,
    Indentation = "    ",      // 4 spaces (default)
    EndOfLine = "\n",          // Unix-style
    
    // Optional: EditorConfig support
    EditorConfigPath = ".editorconfig",
    
    // Or manual
    TabSize = 4,
    UseTabs = false,
    NewLineBeforeOpenBrace = true,
    
    // Import organization (via Formatter.OrganizeImportsAsync)
    OrganizeImports = true
};

var code = classBuilder.ToCode(emitOptions);

// Default behavior
var code = classBuilder.ToCode(); // Uses NormalizeWhitespace defaults

// Fluent configuration
var code = classBuilder
    .ToCode(opts => opts
        .WithIndentation("  ")  // 2 spaces
        .WithUnixLineEndings()
        .OrganizeImports());
```

#### Available Roslyn Formatting APIs

- `.NormalizeWhitespace(indentation, eol)` - Basic formatting (fast)
- `Formatter.Format(node, workspace, options)` - Full formatting engine
- `Formatter.OrganizeImportsAsync(document)` - Import organization
- `.ToFullString()` vs `.ToString()` - Preserve trivia or minimal

**Reference**: Existing usage in `SourceProductionContextExtensions.cs`:
```csharp
return CSharpSyntaxTree
    .ParseText(code)
    .GetRoot()
    .NormalizeWhitespace(indentation: "    ", eol: "\n")
    .ToFullString();
```

---

### 5. Validation as Opt-In Diagnostics

```csharp
// Build without validation (fast)
var classBuilder = TypeBuilder
    .Class("Customer")
    .AddProperty("Name", "string"); // No validation yet

// Validate explicitly (optional)
var diagnostics = classBuilder.Validate();
if (diagnostics.Any(d => d.Severity == DiagnosticSeverity.Error))
{
    // Handle errors
}

// Emit with automatic validation
var result = classBuilder.Emit(); // Returns EmitResult
if (!result.Success)
{
    foreach (var diagnostic in result.Diagnostics)
    {
        Console.WriteLine($"{diagnostic.Severity}: {diagnostic.Message}");
    }
}
```

#### EmitResult Pattern (like Compilation.Emit)

```csharp
public readonly struct EmitResult
{
    public bool Success { get; }
    public ImmutableArray<Diagnostic> Diagnostics { get; }
    public CompilationUnitSyntax? Syntax { get; }
    public string? Code { get; }
    
    public EmitResult OrThrow() 
    {
        if (!Success)
            throw new InvalidOperationException(
                $"Emit failed with {Diagnostics.Length} diagnostic(s)");
        return this;
    }
}
```

#### Diagnostic Definitions

```csharp
public static class EmitDiagnostics
{
    public static Diagnostic MissingTypeName { get; }
    public static Diagnostic InvalidIdentifier { get; }
    public static Diagnostic DuplicateMember { get; }
    public static Diagnostic InvalidTypeReference { get; }
    public static Diagnostic MissingReturnType { get; }
    // ... etc
}
```

#### Validation Levels

```csharp
public enum ValidationLevel
{
    None,       // No validation (builder only)
    Syntax,     // Valid C# syntax
    Semantic,   // Type resolution (requires Compilation)
    Full        // All checks
}

classBuilder.Emit(ValidationLevel.Syntax);
```

---

## Common Patterns

### Property Patterns (80% case)

```csharp
// Auto-property
.AddProperty("UserId", "int")
    .WithAutoPropertyAccessors()

// Auto-property with initializer
.AddProperty("Items", "List<string>")
    .WithAutoPropertyAccessors()
    .WithInitializer("new()")

// Read-only property with expression body
.AddProperty("IsActive", "bool")
    .WithGetter("=> _isActive")
    .AsReadOnly()

// Property with backing field (generated automatically)
.AddProperty("Name", "string")
    .WithBackingField()
    .WithGetter()
    .WithSetter(s => s
        .AddStatement("_name = value")
        .AddStatement("OnPropertyChanged(nameof(Name))"))
```

### Method Patterns

```csharp
// Simple method
.AddMethod("GetById")
    .WithReturnType("Customer?")
    .AddParameter("id", "Guid")
    .WithBody(b => b.AddReturn("_repository.Find(id)"))

// Async method
.AddMethod("SaveAsync")
    .Async()
    .WithReturnType("Task")
    .AddParameter("customer", "Customer")
    .WithBody(b => b
        .AddAwait("_repository.SaveAsync(customer)")
        .AddAwait("_unitOfWork.CommitAsync()"))

// Method with control flow
.AddMethod("Validate")
    .Async()
    .WithReturnType("Task<bool>")
    .WithBody(b => b
        .AddIf("string.IsNullOrEmpty(Name)", 
            then => then.AddReturn("false"))
        .AddReturn("true"))
```

### Constructor Patterns

```csharp
// Primary constructor
.AddPrimaryConstructor()
    .AddParameter("Id", "Guid")
    .AddParameter("Name", "string")

// Regular constructor with dependency injection
.AddConstructor()
    .WithAccessibility(Accessibility.Public)
    .AddParameter("repository", "IRepository")
    .AddParameter("logger", "ILogger")
    .WithBody(b => b
        .AddStatement("_repository = repository")
        .AddStatement("_logger = logger"))

// Constructor chaining
.AddConstructor()
    .AddParameter("id", "Guid")
    .CallsThis("id", "null")
```

### Type Composition

```csharp
// Interface
TypeBuilder
    .Interface("IRepository<T>")
    .InNamespace("MyApp.Core")
    .AddTypeParameter("T")
        .WithConstraint("where T : class")
    .AddMethod("GetByIdAsync")
        .WithReturnType("Task<T?>")
        .AddParameter("id", "Guid");

// Record
TypeBuilder
    .Record("Customer")
    .InNamespace("MyApp.Domain")
    .WithPrimaryConstructor()
        .AddParameter("Id", "Guid")
        .AddParameter("Name", "string");

// Struct
TypeBuilder
    .Struct("Point")
    .InNamespace("MyApp.Types")
    .AddField("X", "int")
        .WithAccessibility(Accessibility.Public)
    .AddField("Y", "int")
        .WithAccessibility(Accessibility.Public);
```

---

## Complete Example

```csharp
var result = TypeBuilder
    .Class("CustomerService")
    .InNamespace("MyApp.Services")
    .WithAutoImports()
    .WithAccessibility(Accessibility.Public)
    
    // Field
    .AddField("_repository", "ICustomerRepository")
        .WithAccessibility(Accessibility.Private)
        .WithModifier(Modifier.Readonly)
    
    // Constructor
    .AddConstructor()
        .WithAccessibility(Accessibility.Public)
        .AddParameter("repository", "ICustomerRepository")
        .WithBody(b => b.AddStatement("_repository = repository"))
    
    // Method with full expression support
    .AddMethod("GetByIdAsync")
        .Async()
        .WithAccessibility(Accessibility.Public)
        .WithReturnType("Task<Customer?>")
        .AddParameter("id", "Guid")
        .WithBody(b => b
            .AddIf(
                condition: c => c.Binary("id", BinaryOperator.Equals, "Guid.Empty"),
                then: t => t.Return(r => r.Null()))
            .DeclareVariable("customer", "var",
                init: i => i.Await(a => a.MemberInvocation("_repository", "FindAsync", "id")))
            .AddReturn("customer"))
    
    // Emit with validation
    .Emit(new EmitOptions 
    { 
        UseRoslynFormatter = true,
        OrganizeImports = true,
        ValidationLevel = ValidationLevel.Syntax
    });

if (result.Success)
{
    File.WriteAllText("CustomerService.cs", result.Code);
}
else
{
    foreach (var diagnostic in result.Diagnostics)
        Console.WriteLine(diagnostic);
}
```

**Generated Output**:
```csharp
using System;
using System.Threading.Tasks;
using MyApp.Domain;

namespace MyApp.Services
{
    public class CustomerService
    {
        private readonly ICustomerRepository _repository;

        public CustomerService(ICustomerRepository repository)
        {
            _repository = repository;
        }

        public async Task<Customer?> GetByIdAsync(Guid id)
        {
            if (id == Guid.Empty)
            {
                return null;
            }

            var customer = await _repository.FindAsync(id);
            return customer;
        }
    }
}
```

---

## Implementation Strategy

### Phase 1: Core Types & Properties (MVP)
- TypeBuilder (class, interface, struct, record)
- PropertyBuilder with auto-properties
- Simple string-based type refs
- Basic formatting (NormalizeWhitespace)
- **Target**: 80% of common scenarios

### Phase 2: Methods & Constructors
- MethodBuilder with string-based bodies
- ConstructorBuilder
- ParameterBuilder
- Validation diagnostics
- **Target**: Complete type definition support

### Phase 3: Expression Building
- ExpressionBuilder API
- BodyBuilder with control flow (if, for, while, etc.)
- Symbol-based type refs
- **Target**: Programmatic body generation

### Phase 4: Advanced Features
- Auto imports with inference
- Full formatting options (EditorConfig, etc.)
- Semantic validation (requires Compilation)
- Attributes, generics constraints, events, indexers
- **Target**: Complete C# feature coverage

---

## Design Decisions

### Why Immutable Builders?
- Matches existing `TypeQuery` pattern
- Thread-safe
- Easier to reason about
- Enables transformation pipelines

### Why Both String and Symbol Type References?
- **String**: Simple, no compilation context needed, covers 90% of cases
- **Symbol**: Type-safe when you have semantic context, enables refactoring

### Why Opt-In Validation?
- **Performance**: Building should be fast
- **Flexibility**: Let users decide validation level
- **Diagnostics**: Rich error reporting at emit time
- **Progressive**: Start simple, validate when needed

### Why Expression Builders?
- **Type-safe**: Catch errors at build time
- **Discoverable**: IDE autocomplete guides you
- **Escape hatch**: Custom() for complex scenarios
- **Optional**: String-based statements still available

---

## Relationship to Existing Deepstaging.Roslyn

### Reading API (Current)
```csharp
// Query and read types
var types = TypeQuery
    .From(compilation)
    .ThatArePublic()
    .ThatAreClasses()
    .GetAll();

foreach (var type in types)
{
    var name = type.Name;
    var properties = type.GetProperties();
    // ... analyze
}
```

### Writing API (Proposed)
```csharp
// Build and emit types
var type = TypeBuilder
    .Class("Customer")
    .WithAccessibility(Accessibility.Public)
    .AddProperty("Name", "string")
    .Emit();

File.WriteAllText("Customer.cs", type.Code);
```

### Symmetry
- **Reading**: `ValidSymbol<T>` wraps `ISymbol` → **Writing**: `EmitResult` wraps `SyntaxNode`
- **Reading**: Fluent queries with filters → **Writing**: Fluent builders with modifiers
- **Reading**: `.Where()` escape hatch → **Writing**: `.Custom()` escape hatch
- **Reading**: Projection pattern → **Writing**: Builder pattern
- **Both**: Type-safe, discoverable, intention-revealing APIs

---

## Open Questions

1. **Attribute support** - How deep should attribute builder API go?
2. **Generic constraints** - Fluent API for `where T : class, new()`?
3. **Events** - Are events common enough for Phase 1?
4. **Partial types** - How to handle multiple partial declarations?
5. **Compilation context** - When to require, when to make optional?
6. **Code comments** - Should builders support XML docs and inline comments?

---

## References

- Existing codebase: `repositories/roslyn/src/Deepstaging.Roslyn/`
- Roslyn formatting: `SourceProductionContextExtensions.cs`
- Reading API patterns: `TypeQuery.cs`, `ValidSymbol.cs`, `PropertyQuery.cs`
- Roslyn docs: [Microsoft.CodeAnalysis.Formatting.Formatter](https://learn.microsoft.com/en-us/dotnet/api/microsoft.codeanalysis.formatting.formatter)

---

**Next Steps**: Sleep on it, review, refine, then implement Phase 1 MVP! 🎯
