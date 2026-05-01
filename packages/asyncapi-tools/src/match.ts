/**
 * RabbitMQ topic-exchange routing-key pattern matching.
 *
 * Reference: https://www.rabbitmq.com/tutorials/tutorial-five
 *
 * Wildcards:
 *   `*` — exactly one word (no dots)
 *   `#` — zero or more words separated by dots
 *
 * Routing keys and patterns are dot-separated (e.g. `user.account.created`).
 * Words consist of any characters except `.`.
 */

export function matchRoutingKey(pattern: string, key: string): boolean {
  return matchSegments(pattern.split("."), key.split("."));
}

/**
 * Compile a routing-key pattern into a reusable matcher. Cheaper than
 * calling `matchRoutingKey` repeatedly with the same pattern.
 */
export function compileRoutingKey(pattern: string): (key: string) => boolean {
  const patternSegments = pattern.split(".");
  return (key: string) => matchSegments(patternSegments, key.split("."));
}

function matchSegments(
  p: ReadonlyArray<string>,
  k: ReadonlyArray<string>,
): boolean {
  if (p.length === 0) return k.length === 0;

  const head = p[0];
  const pTail = p.slice(1);

  if (head === "#") {
    // `#` matches zero or more words. Try every possible split.
    for (let i = 0; i <= k.length; i++) {
      if (matchSegments(pTail, k.slice(i))) return true;
    }
    return false;
  }

  if (k.length === 0) return false;

  if (head === "*" || head === k[0]) {
    return matchSegments(pTail, k.slice(1));
  }

  return false;
}
