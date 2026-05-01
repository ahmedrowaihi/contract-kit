export interface DispatchPluginConfig {
  /** Reserved for future opts (e.g. emitting cancel handles). */
  reserved?: never;
}

export type DispatchResolvedConfig = Required<DispatchPluginConfig>;
