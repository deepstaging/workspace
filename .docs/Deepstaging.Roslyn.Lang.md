# Deepstaging.Roslyn.Lang

This would live within the existing ‘Deepstaging.Roslyn’ project.

Parsing code would live in `Deepstaging.Roslyn/Lang` and have the minimal public API exposed from it’s namespace.

We need a simple text based DSL that we can easily parse to define user authored roslyn queries.

Maybe a simple yaml schema would do the trick but it seems limited for our use case. We need to keep new dependencies to a minimum with zero being the target number.

Must support .netstandard2.0

Conceptual Pseudo Code:

```
triggered_by
	attribute: AttributeName (we should normalize this parsing to be PascalCased and append Attribute to the end if it does already exist)
    	options: Attribute Properties to be exposed

model:

namespace: attribute.containing_symbol.namespace
methods: $method_info

method_info {
	name: method.name
    return_type: method.return_type
}

```