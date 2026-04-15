import { fromRef, ref } from "@hey-api/codegen-core";
import {
	type IR,
	type SchemaVisitor,
	type SchemaVisitorContext,
	type Walker,
	childContext,
	createSchemaWalker,
	operationResponsesMap,
} from "@hey-api/shared";

export interface DiffOptions {
	/** Only include endpoints where this returns true. */
	filter?: (method: string, path: string) => boolean;
}

export interface TypeChange {
	key: string;
	base: string;
	head: string;
}

export interface RequiredChange {
	key: string;
	base: boolean;
	head: boolean;
}

export interface ShapeDiff {
	added: string[];
	removed: string[];
	typeChanged: TypeChange[];
	requiredChanged: RequiredChange[];
}

export interface EndpointDiff {
	endpoint: string;
	method: string;
	path: string;
	request: ShapeDiff | null;
	response: ShapeDiff | null;
}

export interface DiffReport {
	generatedAt: string;
	summary: {
		shared: number;
		matching: number;
		differing: number;
		onlyInBase: number;
		onlyInHead: number;
		drifts: number;
	};
	matching: string[];
	diffed: EndpointDiff[];
	onlyInBase: string[];
	onlyInHead: string[];
}

type PropInfo = { type: string; required: boolean };
type ShapeMap = Map<string, PropInfo>;
type SchemaStore = Record<string, IR.SchemaObject>;

function pathKey(ctx: SchemaVisitorContext): string {
	return fromRef(ctx.path).join(".");
}

function createShapeCollector(store: SchemaStore): {
	walk: Walker<void>;
	shape: ShapeMap;
} {
	const shape: ShapeMap = new Map();

	const visitor: SchemaVisitor<void> = {
		applyModifiers() {},

		array(schema, ctx, walk) {
			const key = pathKey(ctx);
			const item = schema.items?.[0];
			if (item && (item.properties || item.$ref)) {
				shape.set(key, { type: "array<object>", required: false });
				walk(item, childContext(ctx, "[]"));
			} else {
				shape.set(key, {
					type: `array<${item?.type ?? "unknown"}>`,
					required: false,
				});
			}
		},

		boolean(_s, ctx) {
			shape.set(pathKey(ctx), { type: "boolean", required: false });
		},

		enum(schema, ctx) {
			const values = (schema.items ?? [])
				.map((i) => (i.const != null ? String(i.const) : ""))
				.filter(Boolean)
				.sort();
			shape.set(pathKey(ctx), {
				type: values.length ? `enum(${values.join("|")})` : "enum",
				required: false,
			});
		},

		integer(_s, ctx) {
			shape.set(pathKey(ctx), { type: "integer", required: false });
		},

		intersection(items) {
			void items;
		},

		never(_s, ctx) {
			shape.set(pathKey(ctx), { type: "never", required: false });
		},

		null(_s, ctx) {
			shape.set(pathKey(ctx), { type: "null", required: false });
		},

		number(_s, ctx) {
			shape.set(pathKey(ctx), { type: "number", required: false });
		},

		object(schema, ctx, walk) {
			const key = pathKey(ctx);
			if (key) shape.set(key, { type: "object", required: false });
			if (!schema.properties) return;

			const requiredSet = new Set(schema.required ?? []);
			for (const [name, prop] of Object.entries(schema.properties)) {
				const propCtx = childContext(ctx, name);
				walk(prop, propCtx);
				const existing = shape.get(pathKey(propCtx));
				if (existing) existing.required = requiredSet.has(name);
			}
		},

		reference($ref, _schema, ctx) {
			const name = $ref.split("/").at(-1);
			if (name && store[name]) walk(store[name]!, ctx);
		},

		string(_s, ctx) {
			shape.set(pathKey(ctx), { type: "string", required: false });
		},

		tuple(schema, ctx, walk) {
			shape.set(pathKey(ctx), { type: "tuple", required: false });
			for (const [i, item] of (schema.items ?? []).entries()) {
				walk(item, childContext(ctx, i));
			}
		},

		undefined(_s, ctx) {
			shape.set(pathKey(ctx), { type: "undefined", required: false });
		},

		union(items) {
			void items;
		},

		unknown(_s, ctx) {
			shape.set(pathKey(ctx), { type: "unknown", required: false });
		},

		void(_s, ctx) {
			shape.set(pathKey(ctx), { type: "void", required: false });
		},
	};

	const walk = createSchemaWalker(visitor);
	return { walk, shape };
}

function collectShape(schema: IR.SchemaObject, store: SchemaStore): ShapeMap {
	const { walk, shape } = createShapeCollector(store);
	walk(schema, { path: ref([]), plugin: null });
	// Replace empty root key with a typed root entry
	if (shape.has("")) {
		const root = shape.get("")!;
		shape.delete("");
		shape.set("(root)", root);
	} else if (shape.size === 0 && schema.type) {
		shape.set("(root)", { type: schema.type, required: false });
	}
	return shape;
}

function diffShapes(base: ShapeMap, head: ShapeMap): ShapeDiff | null {
	const added: string[] = [];
	const removed: string[] = [];
	const typeChanged: TypeChange[] = [];
	const requiredChanged: RequiredChange[] = [];

	for (const [key] of head) if (!base.has(key)) added.push(key);
	for (const [key] of base) if (!head.has(key)) removed.push(key);

	for (const [key, b] of base) {
		const h = head.get(key);
		if (!h) continue;
		if (b.type !== h.type) typeChanged.push({ key, base: b.type, head: h.type });
		if (b.required !== h.required)
			requiredChanged.push({ key, base: b.required, head: h.required });
	}

	if (!added.length && !removed.length && !typeChanged.length && !requiredChanged.length)
		return null;
	return { added, removed, typeChanged, requiredChanged };
}

function extractEndpoints(
	paths: IR.Model["paths"],
	filter?: DiffOptions["filter"],
): Map<string, { request?: IR.SchemaObject; response?: IR.SchemaObject }> {
	const result = new Map<
		string,
		{ request?: IR.SchemaObject; response?: IR.SchemaObject }
	>();
	if (!paths) return result;

	for (const [path, pathItem] of Object.entries(paths)) {
		for (const method of ["get", "post", "put", "patch", "delete"] as const) {
			const op = pathItem[method];
			if (!op) continue;
			if (filter && !filter(method.toUpperCase(), path)) continue;

			const key = `${method.toUpperCase()} ${path}`;
			const resMap = operationResponsesMap(op);
			result.set(key, {
				request: op.body?.schema,
				response: resMap.response,
			});
		}
	}
	return result;
}

function countDrifts(diffed: EndpointDiff[]): number {
	let n = 0;
	for (const d of diffed) {
		for (const s of [d.request, d.response]) {
			if (!s) continue;
			n += s.removed.length + s.added.length + s.typeChanged.length + s.requiredChanged.length;
		}
	}
	return n;
}

/**
 * Diff two parsed OpenAPI specs (IR models).
 *
 * @param base - The reference spec (source of truth).
 * @param head - The spec to compare against base.
 * @param options - Filter endpoints, configure behavior.
 */
export function diffSpecs(
	base: IR.Model,
	head: IR.Model,
	options?: DiffOptions,
): DiffReport {
	const baseStore: SchemaStore = base.components?.schemas ?? {};
	const headStore: SchemaStore = head.components?.schemas ?? {};

	const baseEps = extractEndpoints(base.paths, options?.filter);
	const headEps = extractEndpoints(head.paths, options?.filter);

	const baseKeys = new Set(baseEps.keys());
	const headKeys = new Set(headEps.keys());

	const shared = [...headKeys].filter((k) => baseKeys.has(k)).sort();
	const onlyInBase = [...baseKeys].filter((k) => !headKeys.has(k)).sort();
	const onlyInHead = [...headKeys].filter((k) => !baseKeys.has(k)).sort();

	const matching: string[] = [];
	const diffed: EndpointDiff[] = [];

	for (const key of shared) {
		const b = baseEps.get(key)!;
		const h = headEps.get(key)!;

		const reqDiff =
			b.request && h.request
				? diffShapes(collectShape(b.request, baseStore), collectShape(h.request, headStore))
				: null;

		const resDiff =
			b.response && h.response
				? diffShapes(
						collectShape(b.response, baseStore),
						collectShape(h.response, headStore),
					)
				: null;

		if (reqDiff || resDiff) {
			const [method, ...rest] = key.split(" ");
			diffed.push({
				endpoint: key,
				method: method!,
				path: rest.join(" "),
				request: reqDiff,
				response: resDiff,
			});
		} else {
			matching.push(key);
		}
	}

	return {
		generatedAt: new Date().toISOString(),
		summary: {
			shared: shared.length,
			matching: matching.length,
			differing: diffed.length,
			onlyInBase: onlyInBase.length,
			onlyInHead: onlyInHead.length,
			drifts: countDrifts(diffed),
		},
		matching,
		diffed,
		onlyInBase,
		onlyInHead,
	};
}
