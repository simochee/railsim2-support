import { semanticSchema } from "./semantic.generated.js";

export function resolveSchemaKey(nodeName: string, parentSchemaKey: string | undefined): string {
  if (parentSchemaKey) {
    const parentSchema = semanticSchema[parentSchemaKey];
    if (parentSchema) {
      const childDef = parentSchema.children[nodeName];
      if (childDef?.schemaKey) {
        return childDef.schemaKey;
      }
    }
  }
  return nodeName;
}
