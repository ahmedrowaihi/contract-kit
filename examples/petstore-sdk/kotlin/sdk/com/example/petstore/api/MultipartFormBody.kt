package com.example.petstore.api

import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody

/**
 * Thin wrapper over OkHttp's `MultipartBody.Builder` — keeps the impl
 * code symmetric with the JSON / form-urlencoded paths.
 *
 *  - `appendText(name, value)`           — text part.
 *  - `appendFile(name, filename, bytes,`
 *    `mimeType)`                          — binary part.
 *  - `build()`                            — finalizes and returns a
 *                                            `RequestBody` ready to pass
 *                                            into `.method("POST", body)`.
 */
public class MultipartFormBody {
    private val builder: MultipartBody.Builder =
        MultipartBody.Builder().setType(MultipartBody.FORM)

    public fun appendText(name: String, value: String) {
        builder.addFormDataPart(name, value)
    }

    public fun appendFile(
        name: String,
        filename: String,
        bytes: ByteArray,
        mimeType: String = "application/octet-stream",
    ) {
        val body: RequestBody = bytes.toRequestBody(mimeType.toMediaTypeOrNull())
        builder.addFormDataPart(name, filename, body)
    }

    public fun build(): RequestBody = builder.build()
}
