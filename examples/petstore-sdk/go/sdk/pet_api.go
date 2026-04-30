package petstore

import (
	"context"
	"net/http"
)

type PetAPI interface {
	// POST /pet
	AddPet(ctx context.Context, body *Pet, opts RequestOptions) (*Pet, error)
	// POST /pet
	AddPetWithResponse(ctx context.Context, body *Pet, opts RequestOptions) (*Pet, *http.Response, error)
	// PUT /pet
	UpdatePet(ctx context.Context, body *Pet, opts RequestOptions) (*Pet, error)
	// PUT /pet
	UpdatePetWithResponse(ctx context.Context, body *Pet, opts RequestOptions) (*Pet, *http.Response, error)
	// GET /pet/findByStatus
	FindPetsByStatus(ctx context.Context, status FindPetsByStatusParamStatus, opts RequestOptions) ([]Pet, error)
	// GET /pet/findByStatus
	FindPetsByStatusWithResponse(ctx context.Context, status FindPetsByStatusParamStatus, opts RequestOptions) ([]Pet, *http.Response, error)
	// GET /pet/findByTags
	FindPetsByTags(ctx context.Context, tags []string, opts RequestOptions) ([]Pet, error)
	// GET /pet/findByTags
	FindPetsByTagsWithResponse(ctx context.Context, tags []string, opts RequestOptions) ([]Pet, *http.Response, error)
	// GET /pet/{petId}
	GetPetById(ctx context.Context, petId int64, opts RequestOptions) (*Pet, error)
	// GET /pet/{petId}
	GetPetByIdWithResponse(ctx context.Context, petId int64, opts RequestOptions) (*Pet, *http.Response, error)
	// POST /pet/{petId}
	UpdatePetWithForm(ctx context.Context, petId int64, name *string, status *string, opts RequestOptions) (*Pet, error)
	// POST /pet/{petId}
	UpdatePetWithFormWithResponse(ctx context.Context, petId int64, name *string, status *string, opts RequestOptions) (*Pet, *http.Response, error)
	// DELETE /pet/{petId}
	DeletePet(ctx context.Context, petId int64, apiKey *string, opts RequestOptions) error
	// DELETE /pet/{petId}
	DeletePetWithResponse(ctx context.Context, petId int64, apiKey *string, opts RequestOptions) (*http.Response, error)
	// POST /pet/{petId}/uploadImage
	UploadFile(ctx context.Context, petId int64, additionalMetadata *string, body []byte, opts RequestOptions) (*ApiResponse, error)
	// POST /pet/{petId}/uploadImage
	UploadFileWithResponse(ctx context.Context, petId int64, additionalMetadata *string, body []byte, opts RequestOptions) (*ApiResponse, *http.Response, error)
	// POST /pet/{petId}/uploadDocument
	UploadPetDocument(ctx context.Context, petId int64, file []byte, title *string, description *string, opts RequestOptions) (*ApiResponse, error)
	// POST /pet/{petId}/uploadDocument
	UploadPetDocumentWithResponse(ctx context.Context, petId int64, file []byte, title *string, description *string, opts RequestOptions) (*ApiResponse, *http.Response, error)
	// POST /tags
	SubmitTags(ctx context.Context, body *SubmitTagsBody, opts RequestOptions) (*SubmitTagsResponse, error)
	// POST /tags
	SubmitTagsWithResponse(ctx context.Context, body *SubmitTagsBody, opts RequestOptions) (*SubmitTagsResponse, *http.Response, error)
}
