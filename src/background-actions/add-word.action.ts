import { QueryClient } from "@tanstack/react-query";
import {
  AddWordPayload,
  AddWordSuccessData,
  BackgroundResponseMessage,
} from "../types/messaging";
import apiClient from "../utils/api-client";

export async function handleAddWord(
  payload: AddWordPayload,
  queryClient: QueryClient,
  sendResponse: (
    response: BackgroundResponseMessage<AddWordSuccessData>
  ) => void
): Promise<void> {
  console.log("[Action: AddWord] Handling request:", payload.word);
  try {
    // Assuming the API expects word, translation, context, etc. in the body
    const data = await apiClient.standard<AddWordSuccessData>(
      "/notebook/words",
      {
        method: "POST",
        body: JSON.stringify({
          word: payload.word,
          translation: payload.translation,
          context: payload.context,
          // Include other relevant fields from payload if necessary
        }),
      }
    );
    console.log("[Action: AddWord] Successfully added word:", data);

    // Invalidate the notebook list query cache after successful addition
    console.log("[Action: AddWord] Invalidating notebook list query cache...");
    await queryClient.invalidateQueries({ queryKey: ["notebook", "list"] }); // Use await for invalidation

    sendResponse({ success: true, data: data ?? undefined }); // Send data or undefined if null
  } catch (error: any) {
    console.error("[Action: AddWord] Failed to add word:", error);
    sendResponse({
      success: false,
      error: error.message || "Failed to add word",
    });
  }
}
