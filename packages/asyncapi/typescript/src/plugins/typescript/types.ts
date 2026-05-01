export interface TypescriptPluginConfig {
  /** Suffix appended to message ids for the message-level interface name. Default: `"Message"`. */
  messageSuffix?: string;
}

export interface TypescriptResolvedConfig {
  messageSuffix: string;
}
