import type { OrderStatus } from '@prisma/client';

export const ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PACKED',
  'READY_TO_SHIP',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'RETURN_REQUESTED',
  'RETURNED',
  'REFUNDED',
  'EXCHANGE_REQUESTED',
  'EXCHANGED',
];

/** Subset of the full docs/13-ORDER-FLOW.md state machine reachable via the API this phase —
 * the enum keeps every documented value (see schema.prisma comment) but only these edges are
 * enforced by OrdersService.transition() until Returns/Payments land. */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PACKED', 'CANCELLED'],
  PACKED: ['READY_TO_SHIP', 'CANCELLED'],
  READY_TO_SHIP: ['SHIPPED'],
  SHIPPED: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
  RETURN_REQUESTED: [],
  RETURNED: [],
  REFUNDED: [],
  EXCHANGE_REQUESTED: [],
  EXCHANGED: [],
};

/** Customer self-cancel is allowed only in these states — matches docs/13-ORDER-FLOW.md's
 * "customer cancel only while status ∈ {PENDING, CONFIRMED}". */
export const CUSTOMER_CANCELLABLE_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
];
