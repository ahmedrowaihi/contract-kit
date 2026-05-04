/* Sample handlers used by the fn-schema test fixtures. */

export interface CreateUserInput {
  email: string;
  name: string;
  age?: number;
  roles: ("admin" | "member" | "guest")[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface PaginationOptions {
  cursor?: string;
  limit?: number;
}

export interface UserPage {
  items: User[];
  nextCursor?: string;
}

/**
 * Create a user record.
 * @schema users.create
 */
export async function createUser(input: CreateUserInput): Promise<User> {
  return {
    id: "u_1",
    email: input.email,
    name: input.name,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Multi-parameter handler — exercises the `parameters: "array"` default.
 * @schema users.list
 */
export async function listUsers(
  tenantId: string,
  options: PaginationOptions,
): Promise<UserPage> {
  void tenantId;
  void options;
  return { items: [] };
}

/** Sync, single-arg, primitive return. */
export function ping(name: string): string {
  return `hello ${name}`;
}

/** Generic — extractor should skip it (default `generics: "skip"`). */
export function identity<T>(value: T): T {
  return value;
}
