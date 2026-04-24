import { apiFetch } from "./client";
import { SessionData, UserPreferences, LibrarySession } from "./types";

export const api = {
  // Session operations
  extractText: (formData: FormData) => 
    apiFetch<{ session_id: string }>("/api/extract", {
      method: "POST",
      body: formData,
    }),

  generateAudio: (sessionId: string) =>
    apiFetch<{ status: string }>("/api/generate", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, mock_eleven: false }),
    }),

  getSession: (sessionId: string) =>
    apiFetch<SessionData>(`/api/session/${sessionId}`),

  getSessionPage: (sessionId: string, pageNumber: number) =>
    apiFetch<any>(`/api/session/${sessionId}/page/${pageNumber}`),


  getDefinition: (word: string) =>
    apiFetch<any>(`/api/dictionary/${word}`),

  // Library operations
  getLibrarySessions: () =>
    apiFetch<LibrarySession[]>("/api/library/sessions"),

  addBookmark: (sessionId: string, text: string) =>
    apiFetch("/api/library/bookmarks", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, text }),
    }),

  addVocabulary: (sessionId: string, word: string) =>
    apiFetch("/api/library/vocabulary", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, word }),
    }),

  translate: (word: string) =>
    apiFetch<{ translation: string }>(`/api/dictionary/translate?word=${word}`),

  // User preferences
  getPreferences: () =>
    apiFetch<UserPreferences>("/api/users/me/preferences"),

  updatePreferences: (preferences: UserPreferences) =>
    apiFetch("/api/users/me/preferences", {
      method: "PUT",
      body: JSON.stringify(preferences),
    }),

  // Auth operations
  getGoogleAuthUrl: () =>
    apiFetch<{ url: string }>("/api/auth/google/url"),

  googleCallback: (code: string, state?: string) => {
    const params = new URLSearchParams({ code });
    if (state) params.append("state", state);
    return apiFetch<{ user: any }>(`/api/auth/google/callback?${params.toString()}`);
  },

  logout: () =>
    apiFetch("/api/auth/logout", { method: "POST" }),

  getMe: () =>
    apiFetch<any>("/api/auth/me"),
};
