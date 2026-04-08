import { ORPCError } from "@orpc/server";
import { os } from "../generated/@ahmedrowaihi/orpc/server.gen";
const store = {
  getInventory: os.store.getInventory.handler(async () => {
    throw new ORPCError("NOT_IMPLEMENTED");
  }),
  placeOrder: os.store.placeOrder.handler(async () => {
    throw new ORPCError("NOT_IMPLEMENTED");
  }),
  deleteOrder: os.store.deleteOrder.handler(async () => {
    throw new ORPCError("NOT_IMPLEMENTED");
  }),
  getOrderById: os.store.getOrderById.handler(async () => {
    throw new ORPCError("NOT_IMPLEMENTED");
  }),
};
export default store;
