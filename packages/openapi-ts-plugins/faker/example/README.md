# Faker Plugin Example

This example demonstrates the faker plugin generating mock data factories from the **Swagger Petstore** OpenAPI spec (same as the orpc example).

## Setup

1. **Build the plugin first:**
   ```bash
   cd ..  # Go to faker plugin root
   npm install
   npm run build
   ```

2. **Install example dependencies:**
   ```bash
   cd example
   npm install
   ```

3. **Generate factories:**
   ```bash
   npm run generate
   ```

   This will create:
   - `generated/@ahmedrowaihi/openapi-ts-faker/factories.gen.js` - Factory functions
   - `generated/types.gen.ts` - TypeScript types

4. **Run the test:**
   ```bash
   npm test
   ```

## What Gets Generated

For the Petstore API schemas (`Pet`, `Order`, `User`, etc.), the plugin generates type-safe factory functions:

```typescript
import { faker } from '@faker-js/faker'
import type { Pet } from '../types.gen'

export const createMockPet = (overrides: Partial<Pet> = {}): Pet => ({
  id: faker.number.int(),
  name: faker.lorem.word(),             // string field
  status: faker.helpers.arrayElement(['available', 'pending', 'sold']), // enum
  category: createMockCategory(),        // nested object
  photoUrls: faker.helpers.multiple(faker.image.url, { count: 3 }), // array
  ...overrides,
})

export const createMockPets = (count = 10) =>
  faker.helpers.multiple(createMockPet, { count })
```

## Usage Examples

```javascript
// Create a single pet
const pet = createMockPet()

// Create pet with custom values
const customPet = createMockPet({
  name: 'Fluffy',
  status: 'available'
})

// Create multiple pets
const pets = createMockPets(50)

// Use in MSW handlers
http.get('/pet/:id', ({ params }) => {
  return HttpResponse.json(createMockPet({ id: Number(params.id) }))
})
```

## OpenAPI Spec

This example uses the **Swagger Petstore API** - the same spec used by the orpc example:
- Source: https://github.com/swagger-api/swagger-petstore
- Schemas: `Pet`, `Order`, `User`, `Category`, `Tag`

This allows you to compare the faker plugin output with the orpc plugin output side-by-side.
