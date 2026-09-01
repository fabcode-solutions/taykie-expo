import { apiClient } from "./client";
import { endpoints } from "./endpoints";

export async function uploadImageToServer(image: string): Promise<any> {
  const formData = new FormData();

  formData.append("image", {
    uri: image,
    type: "image/jpeg",
    name: `image_${Date.now()}.jpg`,
  } as any);

  return apiClient.postFormData(endpoints.upload.image, formData);
}
