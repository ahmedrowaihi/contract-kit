package petstore

import (
	"bytes"
	"mime/multipart"
	"net/textproto"
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

// AppendFile writes a binary form field. mimeType is set to
// application/octet-stream when empty.
func (m *MultipartFormBody) AppendFile(name, filename string, content []byte) error {
	h := make(textproto.MIMEHeader)
	h.Set("Content-Disposition",
		"form-data; name=\""+name+"\"; filename=\""+filename+"\"")
	h.Set("Content-Type", "application/octet-stream")
	w, err := m.writer.CreatePart(h)
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
