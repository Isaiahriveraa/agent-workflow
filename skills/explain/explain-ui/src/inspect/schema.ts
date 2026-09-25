export type FieldSpec = {
  name: string;
  type: string;
  required?: boolean;
  values?: readonly string[];
  default?: unknown;
  note?: string;
};

export type ReconciledField = {
  spec: FieldSpec;
  example: { present: true; value: unknown } | { present: false };
};

export type ReconcileResult = {
  fields: readonly ReconciledField[];
  unlisted: readonly { key: string; value: unknown }[];
  isObject: boolean;
};

const EMPTY_VALUES: readonly string[] = Object.freeze([]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function normalizeSchema(schema: readonly FieldSpec[]): readonly FieldSpec[] {
  return schema.map((field) => {
    const { required, values, ...rest } = field;
    return {
      ...rest,
      ...(required === true ? { required: true } : {}),
      values: values ?? EMPTY_VALUES,
    };
  });
}

export function reconcile(schema: readonly FieldSpec[], values: unknown): ReconcileResult {
  const fields = normalizeSchema(schema);
  if (!isPlainObject(values)) {
    return {
      fields: fields.map((spec) => ({ spec, example: { present: false } })),
      unlisted: [],
      isObject: false,
    };
  }

  const schemaNames = new Set(fields.map(({ name }) => name));
  const reconciledFields = fields.map((spec) => {
    if (Object.hasOwn(values, spec.name)) {
      return {
        spec,
        example: { present: true as const, value: values[spec.name] },
      };
    }
    return { spec, example: { present: false as const } };
  });
  const unlisted = Object.keys(values)
    .filter((key) => !schemaNames.has(key))
    .map((key) => ({ key, value: values[key] }));

  return { fields: reconciledFields, unlisted, isObject: true };
}
