import { apiFetch } from "./client";
import { SessionData, UserPreferences, LibrarySession, CreditBalance } from "./types";

export { apiFetch };

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

  updateSessionName: (sessionId: string, name: string) =>
    apiFetch(`/api/session/${sessionId}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),

  getSessionPage: (sessionId: string, pageNumber: number, generateAudio: boolean = true) =>
    apiFetch<any>(`/api/session/${sessionId}/page/${pageNumber}?generate_audio=${generateAudio}`),


  getDefinition: (word: string) =>
    apiFetch<any>(`/api/dictionary/${word}`),

  // Library operations
  getLibrarySessions: () =>
    apiFetch<LibrarySession[]>("/api/library/sessions"),

  getSessionBookmarks: (sessionId: string) =>
    apiFetch<string[]>(`/api/library/sessions/${sessionId}/bookmarks`),

  addBookmark: (sessionId: string, text: string) =>
    apiFetch("/api/library/bookmarks", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, text }),
    }),

  removeBookmark: (sessionId: string, text: string) =>
    apiFetch("/api/library/bookmarks", {
      method: "DELETE",
      body: JSON.stringify({ session_id: sessionId, text }),
    }),

  addVocabulary: (sessionId: string, word: string) =>
    apiFetch("/api/library/vocabulary", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, word }),
    }),

  translate: (text: string) =>
    apiFetch<{ translation: string }>("/api/dictionary/translate", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  // User preferences
  getPreferences: () =>
    apiFetch<UserPreferences>("/api/users/me/preferences"),

  updatePreferences: (preferences: UserPreferences) =>
    apiFetch("/api/users/me/preferences", {
      method: "PUT",
      body: JSON.stringify(preferences),
    }),

  // Credit operations
  getCredits: () =>
    apiFetch<CreditBalance>("/api/users/me/credits"),

  grantCredits: (targetUserId: string, amount: number, reason = "admin_grant", adminKey: string) =>
    apiFetch<{ user_id: string; granted: number; new_balance: number }>(
      `/api/users/admin/users/${targetUserId}/credits`,
      {
        method: "POST",
        body: JSON.stringify({ amount, reason }),
        headers: { "x-admin-key": adminKey },
      }
    ),

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
