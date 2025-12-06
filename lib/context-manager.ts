// lib/context-manager.ts
import { supabase } from "@/lib/supabase"; // use your existing singleton client

export type Message = {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
};

export async function loadConversationContext(
  sessionId: string,
  limit: number = 20
): Promise<Message[]> {
  const { data, error } = await supabase
    .from("conversation_context")
    .select("messages")
    .eq("session_id", sessionId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data || !data.messages) return [];
  const messages: Message[] = data.messages;
  return messages.slice(-limit);
}

export async function saveConversationContext(
  sessionId: string,
  newMessages: Message[],
  userId?: string | null
): Promise<void> {
  const { data: existing } = await supabase
    .from("conversation_context")
    .select("id, messages")
    .eq("session_id", sessionId)
    .limit(1)
    .maybeSingle();
  let allMessages: Message[] = [];

  if (existing?.messages) {
    allMessages = [...existing.messages, ...newMessages];
  } else {
    allMessages = newMessages;
  }
  if (allMessages.length > 100) allMessages = allMessages.slice(-100);

  if (existing) {
    await supabase
      .from("conversation_context")
      .update({ messages: allMessages, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase.from("conversation_context").insert({
      session_id: sessionId,
      user_id: userId || null,
      messages: allMessages,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
}

export async function summarizeOldContext(
  sessionId: string,
  keepRecentCount = 20
): Promise<string | null> {
  const { data, error } = await supabase
    .from("conversation_context")
    .select("messages")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error || !data || !data.messages) return null;
  const messages: Message[] = data.messages;
  if (messages.length <= keepRecentCount) return null;
  const oldMessages = messages.slice(0, -keepRecentCount);
  // Placeholder summary logic
  return `[Summary] ${oldMessages.length} earlier messages summarized for context.`;
}

export async function clearConversationContext(
  sessionId: string
): Promise<void> {
  await supabase
    .from("conversation_context")
    .delete()
    .eq("session_id", sessionId);
}

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
