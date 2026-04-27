import { ORPCError } from "@orpc/server";
import { os } from "../generated/@ahmedrowaihi/orpc/server.gen";

const user = {
  createUser: os.user.createUser.handler(async () => {
    throw new ORPCError("NOT_IMPLEMENTED");
  }),
  createUsersWithListInput: os.user.createUsersWithListInput.handler(
    async () => {
      throw new ORPCError("NOT_IMPLEMENTED");
    },
  ),
  loginUser: os.user.loginUser.handler(async () => {
    throw new ORPCError("NOT_IMPLEMENTED");
  }),
  logoutUser: os.user.logoutUser.handler(async () => {
    throw new ORPCError("NOT_IMPLEMENTED");
  }),
  deleteUser: os.user.deleteUser.handler(async () => {
    throw new ORPCError("NOT_IMPLEMENTED");
  }),
  getUserByName: os.user.getUserByName.handler(async () => {
    throw new ORPCError("NOT_IMPLEMENTED");
  }),
  updateUser: os.user.updateUser.handler(async () => {
    throw new ORPCError("NOT_IMPLEMENTED");
  }),

  updateProfile: os.user.updateProfile.handler(async () => {
    throw new ORPCError("NOT_IMPLEMENTED");
  }),
};
export default user;
