export interface EventsPluginConfig {
  /** Output filename within the user's output dir. Default: `"events.gen.ts"`. */
  fileName?: string;
}

export interface EventsResolvedConfig {
  fileName: string;
}
