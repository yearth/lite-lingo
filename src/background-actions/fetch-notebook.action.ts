import { QueryClient } from "@tanstack/react-query";
import {
  BackgroundResponseMessage, // Keep type for reference if needed, or remove
  YourWordType,
} from "../types/messaging";
import apiClient from "../utils/api-client";

// Define the expected payload type for this action, if any.
// In this case, MSG_TYPE_QUERY_FETCH_NOTEBOOK might not have a specific payload,
// or it could be an empty object or specific filters. Assuming no specific payload for now.
type FetchNotebookPayload = unknown; // Or define specific filters if applicable

export async function handleFetchNotebook(
  payload: FetchNotebookPayload, // Use the defined payload type
  queryClient: QueryClient,
  sendResponse: (response: BackgroundResponseMessage<YourWordType[]>) => void
): Promise<void> {
  console.log("[Action: FetchNotebook] Handling request...");
  const queryKey = ["notebook", "list"]; // Define query key

  const queryFn = async (): Promise<YourWordType[]> => {
    console.log("[Action: FetchNotebook] Executing queryFn...");
    // Assuming the API returns the structure directly or apiClient handles it
    return await apiClient.standard<YourWordType[]>("/notebook", {
      method: "GET",
    });
  };

  try {
    const data = await queryClient.fetchQuery({ queryKey, queryFn });
    console.log(
      "[Action: FetchNotebook] Successfully fetched:",
      data?.length ?? 0, // Handle potential null/undefined data
      "items"
    );
    // Ensure data is not null/undefined before sending, or send empty array
    sendResponse({ success: true, data: data ?? [] });
  } catch (error: any) {
    // Use 'any' or a more specific error type if known
    console.error("[Action: FetchNotebook] Failed:", error);
    sendResponse({
      success: false,
      error: error.message || "Failed to fetch notebook",
    });
  }
}
