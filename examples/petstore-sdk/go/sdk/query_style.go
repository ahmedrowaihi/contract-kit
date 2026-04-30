package petstore

// QueryStyle controls how array-valued query parameters are
// serialized when explode is false. Matches the OpenAPI 3 `style`
// field. The default is QueryStyleForm with explode=true.
type QueryStyle int

const (
	QueryStyleForm QueryStyle = iota
	QueryStyleSpaceDelimited
	QueryStylePipeDelimited
)
