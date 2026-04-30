package com.example.petstore.api

import okhttp3.HttpUrl

/**
 * Helpers used by generated impl code to add OpenAPI-shaped query
 * parameters onto an `HttpUrl.Builder` without each call site having to
 * know the style/explode rules.
 *
 *  - `addScalar` skips when the value is `null` so optional-and-missing
 *    params don't emit a key at all.
 *  - `addArray` honours `style` + `explode`: explode=true emits one
 *    `?name=v` per element; explode=false joins per the style separator.
 */
public object URLEncoding {
    public fun addScalar(builder: HttpUrl.Builder, name: String, value: Any?) {
        if (value == null) return
        builder.addQueryParameter(name, value.toString())
    }

    public fun addArray(
        builder: HttpUrl.Builder,
        name: String,
        values: List<Any>?,
        style: QueryStyle = QueryStyle.FORM,
        explode: Boolean = true,
    ) {
        if (values == null) return
        if (explode) {
            for (v in values) builder.addQueryParameter(name, v.toString())
            return
        }
        val sep = when (style) {
            QueryStyle.FORM -> ","
            QueryStyle.SPACE_DELIMITED -> " "
            QueryStyle.PIPE_DELIMITED -> "|"
        }
        builder.addQueryParameter(name, values.joinToString(sep) { it.toString() })
    }
}
