/**
 * Central type exports for AI Tools
 * Re-exports from database.types and business.types for convenient imports
 */

// Re-export Supabase database types
export type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Json,
} from "./database.types";

// Re-export business-specific types
export type {
  ProjectWithRelations,
  TaskWithRelations,
  InvoiceWithRelations,
  SculptureBusinessConfig,
  ProjectAnalysis,
  DailyTask,
  ScoredTask,
  Recommendation,
} from "./business.types";

// Re-export utility functions
export { isErrorWithMessage, getErrorMessage } from "./business.types";
