# @ahmedrowaihi/openapi-ts-faker

**Status: Beta** - Production-ready, API may evolve

Generates realistic mock data factories using [Faker.js](https://fakerjs.dev/) from OpenAPI specifications.

## Installation

```bash
npm install @ahmedrowaihi/openapi-ts-faker @hey-api/openapi-ts
npm install @faker-js/faker
```

## What it does

Transforms your OpenAPI schemas into type-safe Faker factory functions:

- **Smart Field Detection** - Intelligently maps fields to appropriate Faker methods
- **Type-Safe Factories** - Full TypeScript support with your schema types
- **Constraint Respect** - Honors min/max, minLength/maxLength, and other constraints
- **Enum Support** - Automatically handles enum values
- **Batch Generators** - Create multiple mock objects at once
- **Customizable** - Override defaults and add custom generators

## Basic Usage

```typescript
import { defineConfig } from '@hey-api/openapi-ts';
import { defineConfig as defineFakerConfig } from '@ahmedrowaihi/openapi-ts-faker';

export default defineConfig({
  input: 'https://api.example.com/openapi.json',
  output: { path: './generated' },
  plugins: [
    '@hey-api/typescript',
    defineFakerConfig(), // Generate faker factories
  ],
});
```

## Generated Output

For this OpenAPI schema:

```yaml
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: integer
        email:
          type: string
          format: email
        username:
          type: string
        age:
          type: integer
          minimum: 18
          maximum: 100
        createdAt:
          type: string
          format: date-time
```

You'll get:

```typescript
// generated/faker/factories.gen.ts
import { faker } from '@faker-js/faker'
import type { User } from '../types.gen'

/**
 * Factory function to create mock User data
 * @param overrides - Partial object to override generated values
 * @returns Mock User object
 */
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: faker.number.int(),
  email: faker.internet.email(),
  username: faker.internet.userName(),
  age: faker.number.int({ min: 18, max: 100 }),
  createdAt: faker.date.recent().toISOString(),
  ...overrides,
})

/**
 * Generate multiple mock User objects
 * @param count - Number of objects to generate (default: 10)
 * @returns Array of mock User objects
 */
export const createMockUsers = (count = 10) =>
  faker.helpers.multiple(createMockUser, { count })
```

## Usage Examples

### Basic Factory

```typescript
import { createMockUser } from './generated/faker/factories.gen'

// Generate a random user
const user = createMockUser()
// {
//   id: 12345,
//   email: 'john.doe@example.com',
//   username: 'johndoe',
//   age: 42,
//   createdAt: '2024-01-15T10:30:00Z'
// }

// Override specific fields
const customUser = createMockUser({
  email: 'specific@example.com',
  age: 25,
})
```

### Batch Generation

```typescript
import { createMockUsers } from './generated/faker/factories.gen'

// Generate 50 users
const users = createMockUsers(50)
```

### With MSW (Mock Service Worker)

```typescript
import { http, HttpResponse } from 'msw'
import { createMockUser, createMockUsers } from './generated/faker/factories.gen'

export const handlers = [
  http.get('/api/users/:id', ({ params }) => {
    return HttpResponse.json(createMockUser({
      id: Number(params.id)
    }))
  }),

  http.get('/api/users', () => {
    return HttpResponse.json(createMockUsers(20))
  }),
]
```

### With Storybook

```typescript
import type { Meta, StoryObj } from '@storybook/react'
import { createMockUser } from './generated/faker/factories.gen'
import { UserCard } from './UserCard'

const meta: Meta<typeof UserCard> = {
  component: UserCard,
}
export default meta

type Story = StoryObj<typeof UserCard>

export const Default: Story = {
  args: {
    user: createMockUser()
  }
}

export const AdminUser: Story = {
  args: {
    user: createMockUser({ role: 'admin' })
  }
}
```

### In Tests

```typescript
import { describe, it, expect } from 'vitest'
import { createMockUser } from './generated/faker/factories.gen'
import { formatUserName } from './utils'

describe('formatUserName', () => {
  it('formats user name correctly', () => {
    const user = createMockUser({
      username: 'johndoe'
    })

    expect(formatUserName(user)).toBe('johndoe')
  })
})
```

## Configuration

### Field Name Hints

Customize how field names map to Faker methods:

```typescript
defineFakerConfig({
  fieldNameHints: {
    userId: 'string.uuid',
    companyId: 'string.uuid',
    phoneNumber: 'phone.number',
    // ... more hints
  }
})
```

**Default hints include:**
- `email` → `internet.email()`
- `username` → `internet.userName()`
- `phone` → `phone.number()`
- `address` → `location.streetAddress()`
- `url` → `internet.url()`
- [See full list in config.ts](./config.ts)

### Format Mapping

Override OpenAPI format → Faker method mapping:

```typescript
defineFakerConfig({
  formatMapping: {
    email: 'internet.email',
    uri: 'internet.url',
    uuid: 'string.uuid',
    'date-time': 'date.recent',
    // ... more formats
  }
})
```

### Custom Generators

Add custom generation logic for specific types:

```typescript
defineFakerConfig({
  customGenerators: {
    UserId: (faker) => `user_${faker.string.alphanumeric(10)}`,
    PostId: (faker) => `post_${faker.string.uuid()}`,
    Timestamp: (faker) => faker.date.past().getTime(),
  }
})
```

### Include/Exclude Schemas

Control which schemas get factories:

```typescript
// Only generate for specific schemas
defineFakerConfig({
  include: ['User', 'Post', 'Comment']
})

// Or exclude specific schemas
defineFakerConfig({
  exclude: ['InternalSchema', 'PrivateData']
})
```

### Advanced Options

```typescript
defineFakerConfig({
  // Output file name (default: 'factories.gen')
  output: 'mocks.gen',

  // Generate batch creators (default: true)
  generateBatchCreators: true,

  // Default count for batch creators (default: 10)
  defaultBatchCount: 20,

  // Generate database seeder utility (default: false)
  generateSeeder: true,

  // Respect schema constraints like min/max (default: true)
  respectConstraints: true,

  // Generate JSDoc comments (default: true)
  generateDocs: true,
})
```

## Smart Field Detection

The plugin uses multiple strategies to choose the right Faker method:

1. **OpenAPI Format** - Checks `format` field (email, uri, uuid, date-time, etc.)
2. **Field Name Hints** - Matches field names to Faker methods
3. **Enum Values** - Uses `faker.helpers.arrayElement()` for enums
4. **Type + Constraints** - Respects min/max, minLength/maxLength
5. **Fallback** - Intelligent defaults based on type

### Examples

```yaml
# OpenAPI Format
email:
  type: string
  format: email
# → faker.internet.email()

# Field Name
username:
  type: string
# → faker.internet.userName()

# Enum
status:
  type: string
  enum: [active, inactive, pending]
# → faker.helpers.arrayElement(['active', 'inactive', 'pending'])

# Constraints
age:
  type: integer
  minimum: 18
  maximum: 100
# → faker.number.int({ min: 18, max: 100 })
```

## Requirements

The faker plugin requires:

- `@hey-api/typescript` plugin (auto-included as dependency)
- `@faker-js/faker` (peer dependency)

## Use Cases

✅ **MSW Handlers** - Generate realistic mock API responses
✅ **Unit Tests** - Create test fixtures
✅ **Storybook** - Populate component stories
✅ **Database Seeding** - Generate seed data
✅ **E2E Tests** - Create test data for Playwright/Cypress
✅ **Component Testing** - Mock props and data

## Why Use This Plugin?

**Without faker plugin:**
```typescript
// Manual mock data - out of sync with API
const mockUser = {
  id: 1,
  email: 'test@test.com', // Not realistic
  username: 'testuser',    // Boring
  age: 30,                 // Static
}
```

**With faker plugin:**
```typescript
// Auto-generated, type-safe, realistic
const mockUser = createMockUser()
// Always in sync with OpenAPI schema
// Realistic data every time
// Type-safe with your actual types
```

## License

MIT
