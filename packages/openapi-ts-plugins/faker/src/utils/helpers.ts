/**
 * Convert a schema name to a factory function name
 * @example "User" -> "createMockUser"
 * @example "BlogPost" -> "createMockBlogPost"
 */
export const schemaToFactoryName = (schemaName: string): string => {
  return `createMock${schemaName}`;
};

/**
 * Convert a schema name to a batch factory function name
 * @example "User" -> "createMockUsers"
 * @example "Post" -> "createMockPosts"
 */
export const schemaToBatchFactoryName = (schemaName: string): string => {
  // Simple pluralization (handles most common cases)
  const pluralized = schemaName.endsWith("s")
    ? schemaName
    : schemaName.endsWith("y")
      ? `${schemaName.slice(0, -1)}ies`
      : `${schemaName}s`;

  return `createMock${pluralized}`;
};

/**
 * Check if a schema should be included based on filters
 */
export const shouldIncludeSchema = (
  schemaName: string,
  include?: readonly string[],
  exclude?: readonly string[],
): boolean => {
  if (include && include.length > 0) {
    return include.includes(schemaName);
  }

  if (exclude && exclude.length > 0) {
    return !exclude.includes(schemaName);
  }

  return true;
};

/**
 * Safely access nested faker methods
 * @example "internet.email" -> "faker.internet.email()"
 * @example "number.int" -> "faker.number.int()"
 */
export const getFakerMethodCall = (
  method: string,
  args?: Record<string, any>,
): string => {
  const hasArgs = args && Object.keys(args).length > 0;
  const argsString = hasArgs ? JSON.stringify(args) : "";

  return `faker.${method}(${argsString})`;
};

/**
 * Escape strings for JSDoc comments
 */
export const escapeJsDoc = (text: string): string => {
  return text.replace(/\*\//g, "*\\/").replace(/\/\*/g, "/\\*");
};

/**
 * Generate JSDoc comment for a factory function
 */
export const generateFactoryJsDoc = (
  schemaName: string,
  description?: string,
): string => {
  const lines = ["/**"];

  if (description) {
    lines.push(` * ${escapeJsDoc(description)}`);
    lines.push(" *");
  }

  lines.push(` * Factory function to create mock ${schemaName} data`);
  lines.push(
    " * @param overrides - Partial object to override generated values",
  );
  lines.push(` * @returns Mock ${schemaName} object`);
  lines.push(" */");

  return lines.join("\n");
};

/**
 * Generate JSDoc comment for a batch factory function
 */
export const generateBatchFactoryJsDoc = (
  schemaName: string,
  defaultCount: number,
): string => {
  return [
    "/**",
    ` * Generate multiple mock ${schemaName} objects`,
    ` * @param count - Number of objects to generate (default: ${defaultCount})`,
    ` * @returns Array of mock ${schemaName} objects`,
    " */",
  ].join("\n");
};
