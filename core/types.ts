export interface PropertyInfo {
  type: string;
  format?: string;
  name: string;
  enum?: (string | number | boolean)[];
  children?: Record<string, PropertyInfo>;
  items?: PropertyInfo;
}

export interface ResponseSchemaInfo {
  properties: Record<string, PropertyInfo>;
  isArray: boolean;
}
