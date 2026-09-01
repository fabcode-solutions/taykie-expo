import { getErrorMessage } from "./postStore";
import { create } from "./stateStorage";
import { uploadImageToServer } from "@/services/api/upload";

type Actions = {
  uploadImage: (imageString: string) => Promise<string | null>;
};

export const useUploadStore = create<Actions>()((set, get) => ({
  uploadImage: async (imageString) => {
    try {
      const response = await uploadImageToServer(imageString);
      return response.data?.url;
    } catch (error) {
      const message = getErrorMessage(error);
      throw Error(message);
    }
  },
}));
