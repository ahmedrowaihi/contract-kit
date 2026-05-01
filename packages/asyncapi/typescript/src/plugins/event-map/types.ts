export interface EventMapPluginConfig {
  /** Suffix used on the message-level interface name. Must match `typescript` plugin's. Default: `"Message"`. */
  messageSuffix?: string;
}

export interface EventMapResolvedConfig {
  messageSuffix: string;
}
