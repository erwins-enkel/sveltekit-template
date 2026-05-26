import * as v from 'valibot';

/** Type-safe form/API schema — validates at the boundary, infers the TypeScript type. */
export const createItemSchema = v.object({
	name: v.pipe(v.string(), v.minLength(1), v.maxLength(255)),
	quantity: v.pipe(v.number(), v.integer(), v.minValue(0))
});

/** Inferred TypeScript types from the Valibot schema — single source of truth. */
export type CreateItemInput = v.InferInput<typeof createItemSchema>;
export type CreateItemOutput = v.InferOutput<typeof createItemSchema>;
