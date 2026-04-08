import { ORPCError } from "@orpc/server";
import { os } from "../generated/@ahmedrowaihi/orpc/server.gen";
const pet = {
  addPet: os.pet.addPet.handler(async () => {
    throw new ORPCError("NOT_IMPLEMENTED");
  }),
  updatePet: os.pet.updatePet.handler(async () => {
    throw new ORPCError("NOT_IMPLEMENTED");
  }),
  findPetsByStatus: os.pet.findPetsByStatus.handler(async () => {
    throw new ORPCError("NOT_IMPLEMENTED");
  }),
  findPetsByTags: os.pet.findPetsByTags.handler(async () => {
    throw new ORPCError("NOT_IMPLEMENTED");
  }),
  deletePet: os.pet.deletePet.handler(async () => {
    throw new ORPCError("NOT_IMPLEMENTED");
  }),
  getPetById: os.pet.getPetById.handler(async () => {
    throw new ORPCError("NOT_IMPLEMENTED");
  }),
  updatePetWithForm: os.pet.updatePetWithForm.handler(async () => {
    throw new ORPCError("NOT_IMPLEMENTED");
  }),
  uploadFile: os.pet.uploadFile.handler(async () => {
    throw new ORPCError("NOT_IMPLEMENTED");
  }),
};
export default pet;
