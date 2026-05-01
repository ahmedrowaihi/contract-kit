import type { FormatMapping } from "./types";

export const DEFAULT_FORMAT_MAPPING: FormatMapping = {
  email: "internet.email",
  uri: "internet.url",
  url: "internet.url",
  hostname: "internet.domainName",
  ipv4: "internet.ipv4",
  ipv6: "internet.ipv6",
  uuid: "string.uuid",
  "date-time": "date.recent",
  date: "date.past",
  time: "date.recent",
  binary: "string.alphanumeric",
  byte: "string.alphanumeric",
  float: "number.float",
  double: "number.float",
  int32: "number.int",
  int64: "number.int",
};

export const DATE_METHODS = new Set([
  "date.past",
  "date.recent",
  "date.birthdate",
]);
