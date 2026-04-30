package petstore

import (
	"bytes"
	"mime/multipart"
)

// MultipartFormBody assembles a multipart/form-data request body.
// Mirrors the runtime helper Swift / Kotlin generators ship; thin
// wrapper over the stdlib mime/multipart writer, kept around so the
// generated impl reads symmetric across languages.
type MultipartFormBody struct {
	buf    *bytes.Buffer
	writer *multipart.Writer
}

// NewMultipartFormBody constructs an empty multipart body.
func NewMultipartFormBody() *MultipartFormBody {
	buf := &bytes.Buffer{}
	return &MultipartFormBody{buf: buf, writer: multipart.NewWriter(buf)}
}

// AppendText writes a text form field.
func (m *MultipartFormBody) AppendText(name, value string) error {
	return m.writer.WriteField(name, value)
}

// AppendFile writes a binary form field. Uses CreateFormFile so name
// and filename are properly escaped/quoted.
func (m *MultipartFormBody) AppendFile(name, filename string, content []byte) error {
	w, err := m.writer.CreateFormFile(name, filename)
	if err != nil {
		return err
	}
	_, err = w.Write(content)
	return err
}

// ContentType returns the multipart/form-data Content-Type header
// including the boundary string.
func (m *MultipartFormBody) ContentType() string { return m.writer.FormDataContentType() }

// Bytes finalizes the multipart body and returns the assembled bytes.
// Subsequent AppendText / AppendFile calls have undefined behavior.
func (m *MultipartFormBody) Bytes() []byte {
	_ = m.writer.Close()
	return m.buf.Bytes()
}
