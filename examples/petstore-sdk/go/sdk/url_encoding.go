package petstore

import (
	"fmt"
	"net/url"
	"reflect"
	"strings"
)

// URLEncoding helpers used by generated impl methods to add OpenAPI-
// shaped query parameters onto a url.Values without each call site
// having to know the style/explode rules.
var URLEncoding = urlEncoding{}

type urlEncoding struct{}

// AddScalar appends a single key/value pair, skipping nil pointers
// and empty optional values.
func (urlEncoding) AddScalar(q url.Values, name string, value any) {
	if value == nil {
		return
	}
	v := reflect.ValueOf(value)
	if v.Kind() == reflect.Ptr {
		if v.IsNil() {
			return
		}
		v = v.Elem()
	}
	q.Set(name, fmt.Sprint(v.Interface()))
}

// AddArray appends an array-valued query parameter following the
// OpenAPI `style` + `explode` rules. explode=true emits one
// `?name=v` per element; explode=false joins per the style separator.
func (urlEncoding) AddArray(q url.Values, name string, values any, style QueryStyle, explode bool) {
	v := reflect.ValueOf(values)
	if v.Kind() == reflect.Ptr {
		if v.IsNil() {
			return
		}
		v = v.Elem()
	}
	if v.Kind() != reflect.Slice && v.Kind() != reflect.Array {
		return
	}
	if v.Len() == 0 {
		return
	}
	if explode {
		for i := 0; i < v.Len(); i++ {
			q.Add(name, fmt.Sprint(v.Index(i).Interface()))
		}
		return
	}
	sep := ","
	switch style {
	case QueryStyleSpaceDelimited:
		sep = " "
	case QueryStylePipeDelimited:
		sep = "|"
	}
	parts := make([]string, v.Len())
	for i := 0; i < v.Len(); i++ {
		parts[i] = fmt.Sprint(v.Index(i).Interface())
	}
	q.Set(name, strings.Join(parts, sep))
}
