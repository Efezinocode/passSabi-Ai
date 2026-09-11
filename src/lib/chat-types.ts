// Shared message/content types used by BOTH the browser chat UI
// (src/routes/app/chat.tsx) and the server-side AI clients
// (groq.server.ts, gemini.server.ts, vision.server.ts).
//
// Why this file exists: groq.server.ts is a server-only file (it holds the
// GROQ_API_KEY logic). Before this change, ContentPart lived inside it,
// which meant the browser chat UI would have had to import a server file
// just to get a type — risky, since a bundler could accidentally pull
// server code into the client bundle. Putting the type here means the
// browser never has to touch a .server.ts file at all.

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type ChatMessage = {
  role: "user" | "assistant";
  content: string | ContentPart[];
};
