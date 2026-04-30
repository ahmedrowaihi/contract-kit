package petstore

type FindPetsByStatusParamStatus string

const (
	FindPetsByStatusParamStatusAvailable FindPetsByStatusParamStatus = "available"
	FindPetsByStatusParamStatusPending FindPetsByStatusParamStatus = "pending"
	FindPetsByStatusParamStatusSold FindPetsByStatusParamStatus = "sold"
)
