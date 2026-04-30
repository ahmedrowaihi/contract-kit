package com.example.petstore.api

/**
 * Query-array serialization style — matches the OpenAPI 3 `style` field
 * for query parameters whose value is an array. The default is `form`
 * with explode=true; the others appear when the spec opts into them.
 */
public enum class QueryStyle {
    FORM,
    SPACE_DELIMITED,
    PIPE_DELIMITED,
}
