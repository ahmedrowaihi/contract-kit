/**
 * Typed accessors for AMQP 0.3.0 bindings on AsyncAPI 3.0 documents.
 *
 * Spec: https://github.com/asyncapi/bindings/blob/v3.0.0/amqp/README.md
 *
 * `@asyncapi/parser` exposes the binding wrapper but `binding.value()` returns
 * `any`. We narrow that to the spec'd shape here so generators can rely on
 * typed extractors instead of guessing field names.
 */

import type {
  ChannelInterface,
  MessageInterface,
  OperationInterface,
  ServerInterface,
} from "@asyncapi/parser";

export type AmqpExchangeType =
  | "topic"
  | "direct"
  | "fanout"
  | "default"
  | "headers";

export interface AmqpExchangeProps {
  /** Exchange name. Max 255 characters per spec. */
  name: string;
  type: AmqpExchangeType;
  durable?: boolean;
  autoDelete?: boolean;
  /** Defaults to `/`. */
  vhost?: string;
}

export interface AmqpQueueProps {
  /** Queue name. Max 255 characters per spec. */
  name: string;
  durable?: boolean;
  exclusive?: boolean;
  autoDelete?: boolean;
  vhost?: string;
}

export type AmqpChannelBinding =
  | {
      is: "routingKey";
      exchange: AmqpExchangeProps;
      queue?: AmqpQueueProps;
      bindingVersion?: string;
    }
  | {
      is: "queue";
      queue: AmqpQueueProps;
      exchange?: AmqpExchangeProps;
      bindingVersion?: string;
    };

export interface AmqpOperationBinding {
  /** TTL of the message, in milliseconds. */
  expiration?: number;
  /** Identifies the user that publishes the message. */
  userId?: string;
  /** Routing keys the message should be routed to (in addition to the binding key). */
  cc?: string[];
  /** Message priority (0–9 typically). */
  priority?: number;
  /** 1 = transient, 2 = persistent. */
  deliveryMode?: 1 | 2;
  /** Mandatory flag — if true, returns the message to the publisher when no queue is bound. (publish only) */
  mandatory?: boolean;
  /** Like `cc` but consumers won't see it. (publish only) */
  bcc?: string[];
  /** Whether the broker should add a timestamp on publish. */
  timestamp?: boolean;
  /** Whether the consumer should ack messages. (subscribe only) */
  ack?: boolean;
  bindingVersion?: string;
}

export interface AmqpMessageBinding {
  contentEncoding?: string;
  messageType?: string;
  bindingVersion?: string;
}

/** Server bindings for AMQP are currently empty/reserved per spec. */
export type AmqpServerBinding = Record<string, never>;

/**
 * Extract the typed AMQP channel binding from a parsed channel, or undefined
 * if the channel has no AMQP binding. Does not validate `bindingVersion`.
 */
export function getAmqpChannelBinding(
  channel: ChannelInterface,
): AmqpChannelBinding | undefined {
  return readAmqpBinding<AmqpChannelBinding>(channel.bindings());
}

export function getAmqpOperationBinding(
  operation: OperationInterface,
): AmqpOperationBinding | undefined {
  return readAmqpBinding<AmqpOperationBinding>(operation.bindings());
}

export function getAmqpMessageBinding(
  message: MessageInterface,
): AmqpMessageBinding | undefined {
  return readAmqpBinding<AmqpMessageBinding>(message.bindings());
}

export function getAmqpServerBinding(
  server: ServerInterface,
): AmqpServerBinding | undefined {
  return readAmqpBinding<AmqpServerBinding>(server.bindings());
}

/**
 * Convenience: pull the exchange config out of a channel binding regardless
 * of `is` value (channels with `is: queue` may still declare an exchange to
 * bind to).
 */
export function getAmqpExchange(
  channel: ChannelInterface,
): AmqpExchangeProps | undefined {
  return getAmqpChannelBinding(channel)?.exchange;
}

export function getAmqpQueue(
  channel: ChannelInterface,
): AmqpQueueProps | undefined {
  return getAmqpChannelBinding(channel)?.queue;
}

function readAmqpBinding<T extends { bindingVersion?: string }>(
  bindings: ReturnType<ChannelInterface["bindings"]>,
): T | undefined {
  const binding = bindings.get("amqp");
  if (!binding) return undefined;
  // The parser separates bindingVersion onto the wrapper; merge it back in
  // so callers get the full spec'd shape from one object.
  const value = binding.value() as T;
  const version = binding.version();
  return version ? { ...value, bindingVersion: version } : value;
}
