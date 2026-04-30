package petstore

// APIKeyLocation matches the OpenAPI securitySchemes.<name>.in field.
type APIKeyLocation int

const (
	APIKeyHeader APIKeyLocation = iota
	APIKeyQuery
	APIKeyCookie
)
