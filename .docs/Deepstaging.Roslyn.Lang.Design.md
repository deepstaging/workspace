# Deepstaging.Roslyn.Lang - Design Document

**Status:** Planning Phase  
**Last Updated:** 2026-01-06 (Iteration 4)  
**Target:** .NET Standard 2.0  
**New Repository:** `Deepstaging.Roslyn.Dsl` (to be created)

---

## 1. Overview

A simple text-based DSL for defining **Symbol Projections** - user-authored definitions that parse into C# code backed by Deepstaging.Roslyn APIs. The DSL will be parsed within the new `Deepstaging.Roslyn.Dsl` repository with a minimal public API surface.

---

## 2. Current Knowledge

### 2.1 Project Structure
- **Repository:** `Deepstaging.Roslyn.Dsl` (new, to be created via workspace-repository-create)
- **API Surface:** Minimal public API exposure
- **Dependencies:** Zero new dependencies (target)
- **Target Framework:** .NET Standard 2.0
- **File Extension:** `.rq` (Roslyn Query)
- **File Location:** Not constrained; user/project configurable

### 2.2 Purpose & Vision
- **Terminology:** **SymbolProjection** - defines how to shape/project Roslyn symbol data
- **Primary Goal:** Help developers quickly create query classes like `EmailValidationQuery.cs`
- **Core Workflow:** `.rq` file → Parser → Generated C# string → Lightbulb diagnostic/analyzer saves to project
- **Target Audience:** .NET developers who want easy Roslyn tooling development
- **Reference Example:** `MyRoslynTool.Queries/EmailValidationQuery.cs` and `ValidatorModel.cs`
- **End Output:** Deepstaging.Roslyn queries project symbols into models consumed by Scriban template engine

### 2.3 Architecture
- **Parser Layer:** Parses `.rq` text documents
- **Code Generation:** Generates C# partial class strings (not file I/O at this layer)
- **IDE Integration:** Lightbulb diagnostics + analyzers handle file creation/location
- **Query/Projection Layer:** Generated code uses existing Deepstaging.Roslyn query & projection API
- **Query Filtering:** Deepstaging.Roslyn QueryMethods handle "what to query" (filtering deferred to later phase)
- **Template Layer:** Models consumed by Scriban template engine
- **Namespace Resolution:** Generated classes use namespace from the attributed type
- **Error Reporting:** Integrate with Roslyn diagnostics

### 2.4 DSL Design Principles
- **Simplicity First:** No variables, no conditional logic, no loops, minimal filtering (initially)
- **Code Generation:** Output is starting point; developers customize afterward
- **Partial Classes:** Protect manual customizations from regeneration
- **Inline Sub-projections:** Support nested projection definitions that generate separate types
- **Legible Syntax:** Optimize for quick in-and-out editing
- **Schema Support:** JSON Schema standard for IDE IntelliSense
- **Type Safety:** Projections must declare expected types; leverage Deepstaging.Roslyn casting methods
- **Maintainability:** Parser code must be readable without agent intervention

### 2.5 Syntax Format Decision
**Format:** YAML (with JSON Schema for validation)
- **Schema Distribution:** Separate `.json` file distributed with package
- **IDE Integration:** Schema enables IntelliSense in IDE
- **Type Declaration:** `string name: value` syntax (Option C) if legal YAML, else Option B
- **Collection Syntax:** Array notation `TypeName[]` for collections, plain `TypeName` for single items

**Example Syntax:**
```yaml
model: ValidatorModel
properties:
  string namespace: symbol.containing_namespace
  EmailPropertyInfo[] email_properties:
    string name: property.name
    string type_name: property.return_type.name
    bool is_string: property.return_type.special_type == System_String
```

### 2.6 Property Projection Model
**Syntax Pattern:** `type property_name: source_expression`
- **Type:** C# type name (string, bool, int, custom types)
- **Property Name:** Becomes property name in generated class
- **Source Expression:** Roslyn symbol accessor (e.g., `method.name`, `property.return_type.name`)
- **Type Casting:** Uses Deepstaging.Roslyn casting methods (see src/Deepstaging.Roslyn.Tests for examples)

### 2.7 Nested Projections
- **Syntax:** `TypeName[] property_name:` or `TypeName property_name:`
- **Arrays:** `TypeName[]` generates collection property
- **Single:** `TypeName` generates single instance property
- **Generated:** Separate partial class for nested type
- **Example:** `EmailPropertyInfo[] email_properties:` generates `EmailPropertyInfo` class and collection property

### 2.8 Code Generation Style
- **Format:** Readable (indented, proper formatting)
- **Comments:** Indicate DSL source/origin
- **Modern C#:** Consider `#nullable` directives, file-scoped namespaces
- **Attributes:** Add `[GeneratedCode]` attributes
- **Partial Classes:** All generated classes are partial

### 2.9 Concrete Example (EmailValidation)

**Target Output (what developers currently write manually):**
- **Query Class:** `EmailValidationQuery.cs` with extension methods
- **Model Class:** `ValidatorModel.cs` record with ClassSymbol, EmailProperties
- **Nested Model:** `EmailPropertyInfo.cs` record with property details

**Goal:** Generate these from `.rq` file definition

### 2.10 Known Constraints
- Must avoid external dependencies (target: zero)
- Must support .NET Standard 2.0
- DSL will need versioning as it evolves
- No custom functions/helpers in DSL - all capabilities built-in
- Parser code must be maintainable without agent intervention
- Integration with Roslyn diagnostics for error reporting

---

## 3. Open Questions & Answers

**Instructions:** Add your answers below each question. When you're ready, ask me to "update knowledge from Q&A" and I'll synthesize them into Section 2.

### 3.1 Parser Implementation Examples

**Q33:** Side-by-side minimal parser implementations ready. Should I:
- Create them in Section 6 (Scratch Area) of this document?
- Create separate files: `parser-recursive-descent.md` and `parser-tokenizer.md`?
- Create actual C# prototype files to review?

**A33:** _[Your answer here]_

Create separate files

### 3.2 YAML Type Syntax Validation

**Q34:** Need to validate if `string name: value` is legal YAML syntax. Should I:
- Research and document findings here?
- Prototype a small YAML example to test?
- Adjust to Option B format if Option C isn't valid YAML?

**A34:** _[Your answer here]_

Adjust to Option B format if Option C isn't valid YAML?

### 3.3 Concrete `.rq` File Design

**Q35:** Based on `EmailValidationQuery.cs` example, can you sketch what the ideal `.rq` file would look like? This will anchor the entire syntax design.

Example structure to consider:
```yaml
# EmailValidation.rq
projection: EmailValidation
query_method: QueryEmailValidation
models:
  ValidatorModel:
    properties:
      # ... what goes here?
  EmailPropertyInfo:
    properties:
      # ... what goes here?
```

**A35:** _[Your answer here]_

```yaml
models:
  ValidatorModel:
  	from: INamedTypeSymbol #This must be a valid Roslyn SYmbol type
    properties:
      string Namespace: any valid property from the selected sybol type.
      string ClassName: any valid property from the selected sybol type.
      EmailPropertyInfo[] EmailProperties: I'm not sure how to describe this. Our example has EmailProperties exposed through a record Constructor. making this a dependency.
```

Maybe the right thing to do here is simply output a Csharp type with the properties defined. If we can successfully create the property using Deepstaging.Roslyn, we should. If not generate the properties with a NotImplementedException thrown.

query_method should be optional and default to 'Query + ‘projection’'

We should be able to learn the Deepstaging.Roslyn API deeply enough to be able to generate the properties correctly.

### 3.4 Deepstaging.Roslyn API Pattern Discovery

**Q36:** Should I explore `src/Deepstaging.Roslyn.Tests` to:
- Document the casting/query API patterns?
- Create a reference guide for DSL design?
- Identify which operations map to DSL expressions?

**A36:** _[Your answer here]_

Yes to all of those questions!

### 3.5 Schema Design Kickoff

**Q37:** For the JSON Schema, should I:
- Draft initial schema structure now?
- Wait until syntax is fully locked down?
- Create incremental schema as we refine syntax?

**A37:** _[Your answer here]_

Wait until syntax is fully locked down

### 3.6 Repository Creation

**Q38:** You mentioned creating `Deepstaging.Roslyn.Dsl` repository next session. What should be included initially?
- Just the parser project?
- Parser + analyzer/lightbulb projects?
- Include schema file, test project, sample `.rq` files?
- Any specific project structure preferences?

**A38:** _[Your answer here]_

---

## 4. Design Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-06 | Target .NET Standard 2.0 | Broad compatibility |
| 2026-01-06 | Zero external dependencies (target) | Minimize maintenance burden |
| 2026-01-06 | Output format: C# partial classes | Allows dev customization without regeneration loss |
| 2026-01-06 | No DSL logic (conditionals/loops/vars) | Keep it simple; devs customize generated code |
| 2026-01-06 | Support nested sub-projections inline | Each generates separate type |
| 2026-01-06 | Remove trigger mechanism | Not needed for initial use case |
| 2026-01-06 | Plan for DSL versioning | Likely needed as language evolves |
| 2026-01-06 | Terminology: SymbolProjection | Describes DSL purpose accurately |
| 2026-01-06 | File extension: `.rq` | Roslyn Query |
| 2026-01-06 | File location: User configurable | IDE integration handles placement |
| 2026-01-06 | Namespace from attributed type | Generated class matches source context |
| 2026-01-06 | Parser generates C# strings only | No file I/O at parser layer |
| 2026-01-06 | IDE integration via lightbulb/analyzer | Modern Roslyn workflow |
| 2026-01-06 | Properties must declare types | Type safety over inference |
| 2026-01-06 | Filtering deferred to later | QueryMethods handle initial needs |
| 2026-01-06 | Syntax format: YAML | Schema support for DX, descriptive feel |
| 2026-01-06 | Type syntax: `type name: value` (C) or separate (B) | Depends on YAML validity |
| 2026-01-06 | Collection syntax: `TypeName[]` | Clean array notation |
| 2026-01-06 | Schema: JSON Schema standard | Industry standard, IDE support |
| 2026-01-06 | Schema distribution: Separate file | Distributed with package |
| 2026-01-06 | Error reporting: Roslyn diagnostics | Consistent with tooling ecosystem |
| 2026-01-06 | Generated code: Readable format | Developer-friendly, includes comments |
| 2026-01-06 | New repository: Deepstaging.Roslyn.Dsl | Separate concerns, focused scope |
| 2026-01-06 | Parser maintainability critical | Must be readable without agent help |
| 2026-01-06 | Need parser comparison examples | Side-by-side for informed decision |

---

## 5. Next Steps

1. ✅ **Synthesize answers** - Knowledge updated from Q&A
2. **Create parser examples** - Side-by-side recursive descent vs tokenizer+parser
3. **Draft concrete `.rq` syntax** - Based on EmailValidation example
4. **Validate YAML type syntax** - Confirm Option C is legal YAML
5. **Explore Deepstaging.Roslyn APIs** - Document patterns for DSL mapping
6. **Draft JSON Schema** - Initial version for `.rq` files
7. **Create Deepstaging.Roslyn.Dsl repository** - Next session prep
8. **Prototype implementation** - Small working parser for validation

---

## 6. Scratch Area

_Use this space for temporary notes, ideas, or sketches during discussions._

### Reference: EmailValidation Example Structure

**Query Class Pattern:**
```csharp
public static class EmailValidationQuery
{
    extension(ISymbol symbol)
    {
        public ValidatorModel? QueryEmailValidation()
        {
            // Query logic using Deepstaging.Roslyn
        }
    }
}
```

**Model Pattern:**
```csharp
public sealed record ValidatorModel(
    INamedTypeSymbol ClassSymbol,
    ImmutableArray<EmailPropertyInfo> EmailProperties
)
{
    public string Namespace => ClassSymbol.ContainingNamespace.ToDisplayString();
    public string ClassName => ClassSymbol.Name;
    // ... computed properties
}
```

---

## Notes for Iteration

**To iterate on this document:**
1. Add your answers to Section 3 (Q&A)
2. Tag this file and ask me to "update knowledge from Q&A"
3. I'll synthesize answers into Section 2 (Current Knowledge) and Section 4 (Decisions), clearing old Q&A
4. I'll add new questions based on your answers
5. Repeat!
