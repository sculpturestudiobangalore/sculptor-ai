import { tool } from "ai";
import { z } from "zod";
import { supabase } from "@/lib/supabase";

/**
 * TOOL 1: Save Context Memory
 * Allows the AI to store information, preferences, or learned patterns for future reference.
 */
export const saveContextMemoryTool = tool({
  description:
    "Save or update a piece of context memory. Use this to store user preferences, project insights, or learned patterns that should be remembered for future interactions.",
  inputSchema: z.object({
    key: z
      .string()
      .describe(
        "Unique identifier for this memory (e.g., 'user_preference_daily_task_format', 'project_history_alpha')"
      ),
    type: z
      .string()
      .describe(
        "Category of the memory (e.g., 'preference', 'learning', 'project_history', 'user_fact')"
      ),
    value: z
      .any()
      .describe(
        "The actual data to store. Can be a string, number, object, or array."
      ),
  }),
  execute: async (input) => {
    try {
      const { data, error } = await supabase
        .from("ai_context_memory")
        .upsert(
          {
            context_key: input.key,
            context_type: input.type,
            context_value: input.value,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "context_key" }
        )
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to save memory: ${error.message}`,
        };
      }

      return {
        success: true,
        data: {
          key: data.context_key,
          type: data.context_type,
          value: data.context_value,
        },
        message: `✅ Saved memory: ${input.key}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * TOOL 2: Retrieve Context Memory
 * Allows the AI to recall specific information by its key.
 */
export const retrieveContextMemoryTool = tool({
  description:
    "Retrieve a specific piece of context memory by its unique key. Use this when you need to recall a specific preference or fact.",
  inputSchema: z.object({
    key: z.string().describe("The unique identifier of the memory to retrieve"),
  }),
  execute: async (input) => {
    try {
      const { data, error } = await supabase
        .from("ai_context_memory")
        .select("*")
        .eq("context_key", input.key)
        .single();

      if (error) {
        // If not found, return null instead of error to allow graceful handling
        if (error.code === "PGRST116") {
          return {
            success: true,
            found: false,
            message: `No memory found for key: ${input.key}`,
          };
        }
        return {
          success: false,
          error: `Failed to retrieve memory: ${error.message}`,
        };
      }

      return {
        success: true,
        found: true,
        data: {
          key: data.context_key,
          type: data.context_type,
          value: data.context_value,
          updatedAt: data.updated_at,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * TOOL 3: Search Context Memory
 * Allows the AI to find relevant memories based on type or search query.
 */
export const searchContextMemoryTool = tool({
  description:
    "Search for context memories. Use this to find relevant information when you don't know the exact key, or to get all memories of a certain type.",
  inputSchema: z.object({
    type: z
      .string()
      .optional()
      .describe("Filter by memory category (e.g., 'preference', 'learning')"),
    searchQuery: z
      .string()
      .optional()
      .describe(
        "Search term to match against the memory key or value (text representation)"
      ),
    limit: z
      .number()
      .optional()
      .describe("Maximum number of results to return (default: 10)"),
  }),
  execute: async (input) => {
    try {
      let query = supabase.from("ai_context_memory").select("*");

      if (input.type) {
        query = query.eq("context_type", input.type);
      }

      if (input.searchQuery) {
        // Search in key or cast value to text and search
        query = query.or(
          `context_key.ilike.%${input.searchQuery}%,context_type.ilike.%${input.searchQuery}%`
        );
      }

      const { data, error } = await query
        .order("updated_at", { ascending: false })
        .limit(input.limit || 10);

      if (error) {
        return {
          success: false,
          error: `Failed to search memories: ${error.message}`,
        };
      }

      return {
        success: true,
        count: data.length,
        memories: data.map((m) => ({
          key: m.context_key,
          type: m.context_type,
          value: m.context_value,
          updatedAt: m.updated_at,
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
