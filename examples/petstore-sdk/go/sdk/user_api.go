package petstore

import (
	"context"
	"net/http"
)

type UserAPI interface {
	// POST /user
	CreateUser(ctx context.Context, body *User, opts RequestOptions) (*User, error)
	// POST /user
	CreateUserWithResponse(ctx context.Context, body *User, opts RequestOptions) (*User, *http.Response, error)
	// POST /user/createWithList
	CreateUsersWithListInput(ctx context.Context, body *[]User, opts RequestOptions) (*User, error)
	// POST /user/createWithList
	CreateUsersWithListInputWithResponse(ctx context.Context, body *[]User, opts RequestOptions) (*User, *http.Response, error)
	// GET /user/login
	LoginUser(ctx context.Context, username *string, password *string, opts RequestOptions) (string, error)
	// GET /user/login
	LoginUserWithResponse(ctx context.Context, username *string, password *string, opts RequestOptions) (string, *http.Response, error)
	// GET /user/logout
	LogoutUser(ctx context.Context, opts RequestOptions) error
	// GET /user/logout
	LogoutUserWithResponse(ctx context.Context, opts RequestOptions) (*http.Response, error)
	// GET /user/{username}
	GetUserByName(ctx context.Context, username string, opts RequestOptions) (*User, error)
	// GET /user/{username}
	GetUserByNameWithResponse(ctx context.Context, username string, opts RequestOptions) (*User, *http.Response, error)
	// PUT /user/{username}
	UpdateUser(ctx context.Context, username string, body *User, opts RequestOptions) error
	// PUT /user/{username}
	UpdateUserWithResponse(ctx context.Context, username string, body *User, opts RequestOptions) (*http.Response, error)
	// DELETE /user/{username}
	DeleteUser(ctx context.Context, username string, opts RequestOptions) error
	// DELETE /user/{username}
	DeleteUserWithResponse(ctx context.Context, username string, opts RequestOptions) (*http.Response, error)
	// POST /profile
	UpdateProfile(ctx context.Context, body *UpdateProfileBody, opts RequestOptions) (*UpdateProfileResponse, error)
	// POST /profile
	UpdateProfileWithResponse(ctx context.Context, body *UpdateProfileBody, opts RequestOptions) (*UpdateProfileResponse, *http.Response, error)
}
