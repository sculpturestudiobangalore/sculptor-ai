import { z } from "zod";

export interface Tool {
  name: string;
  description: string;
  parameters: z.ZodObject<any>;
  execute: (args: any) => Promise<any>;
}

export interface Task {
  id: string;
  name: string;
  project_name: string;
  template_id: string;
  estimated_hours: number;
  dependencies: string[];
  assigned_to: string;
  status: "pending" | "in_progress" | "completed" | "postponed";
  required_materials: { material: string; quantity: number }[];
  required_skills: string[];
}

export interface ScheduledTask {
  task: Task;
  startTime: string;
  endTime: string;
  assignedTo: string;
  dependencies: string[];
}

export interface ParallelWork {
  mainTask: string;
  parallelTask: string;
  reason: string;
}

export interface Constraint {
  type: "material" | "vendor" | "team" | "equipment" | "weather";
  message: string;
  severity: "blocker" | "warning" | "info";
}

export interface OptimizedSchedule {
  date: string;
  tasks: ScheduledTask[];
  parallelOpportunities: ParallelWork[];
  riskFactors: Constraint[];
  confidenceScore: number;
}
