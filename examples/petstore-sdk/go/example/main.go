package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"petstore"
)

func main() {
	client := petstore.NewAPIClient("https://petstore3.swagger.io/api/v3")
	pets := petstore.NewNetHTTPPetAPI(client)
	ctx := context.Background()

	read(ctx, pets, 10)
	readWithResponse(ctx, pets, 10)
	readWithTimeout(ctx, pets, 10, 5*time.Second)
	readWithValidator(ctx, pets, 10)
	readNotFound(ctx, pets, 99999999)
}

func read(ctx context.Context, pets petstore.PetAPI, id int64) {
	pet, err := pets.GetPetById(ctx, id, petstore.RequestOptions{})
	if err != nil {
		printErr("read", err)
		return
	}
	fmt.Printf("read: id=%d name=%s\n", deref(pet.Id), pet.Name)
}

func readWithResponse(ctx context.Context, pets petstore.PetAPI, id int64) {
	pet, resp, err := pets.GetPetByIdWithResponse(ctx, id, petstore.RequestOptions{})
	if err != nil {
		printErr("readWithResponse", err)
		return
	}
	fmt.Printf("readWithResponse: id=%d status=%d ct=%s\n",
		deref(pet.Id), resp.StatusCode, resp.Header.Get("Content-Type"))
}

func readWithTimeout(ctx context.Context, pets petstore.PetAPI, id int64, d time.Duration) {
	pet, err := pets.GetPetById(ctx, id, petstore.RequestOptions{Timeout: d})
	if err != nil {
		printErr("readWithTimeout", err)
		return
	}
	fmt.Printf("readWithTimeout: id=%d\n", deref(pet.Id))
}

func readWithValidator(ctx context.Context, pets petstore.PetAPI, id int64) {
	validate := func(body []byte, resp *http.Response) error {
		if len(body) == 0 {
			return errors.New("empty body")
		}
		if !strings.Contains(resp.Header.Get("Content-Type"), "json") {
			return fmt.Errorf("not JSON: %s", resp.Header.Get("Content-Type"))
		}
		return nil
	}
	pet, err := pets.GetPetById(ctx, id, petstore.RequestOptions{ResponseValidator: validate})
	if err != nil {
		printErr("readWithValidator", err)
		return
	}
	fmt.Printf("readWithValidator: id=%d\n", deref(pet.Id))
}

func readNotFound(ctx context.Context, pets petstore.PetAPI, id int64) {
	_, err := pets.GetPetById(ctx, id, petstore.RequestOptions{})
	if err == nil {
		fmt.Println("readNotFound: UNEXPECTED — should have failed")
		return
	}
	var apiErr *petstore.APIError
	if errors.As(err, &apiErr) {
		fmt.Printf("readNotFound: caught APIError kind=%s status=%d\n",
			apiErr.Kind, apiErr.StatusCode)
	} else {
		fmt.Printf("readNotFound: unexpected err type %T: %v\n", err, err)
	}
}

func deref(p *int64) int64 {
	if p == nil {
		return 0
	}
	return *p
}

func printErr(label string, err error) {
	var apiErr *petstore.APIError
	if errors.As(err, &apiErr) {
		fmt.Printf("%s — APIError kind=%s status=%d\n", label, apiErr.Kind, apiErr.StatusCode)
		return
	}
	fmt.Printf("%s — %v\n", label, err)
}
