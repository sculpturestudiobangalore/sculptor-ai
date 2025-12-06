import { tool } from "ai";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { ConstraintScheduler } from "./utilities/scheduler-engine";

// ========== NEW/UPDATED TOOLS ==========

export const generateDailyScheduleTool = tool({
  description:
    "Generate optimized daily task schedule considering dependencies, workers, materials, and constraints",
  inputSchema: z.object({
    date: z
      .string()
      .optional()
      .describe("Date in YYYY-MM-DD format (defaults to today)"),
  }),
  execute: async (input) => {
    try {
      const scheduleDate = input.date ? new Date(input.date) : new Date();
      const isoDate = scheduleDate.toISOString().split("T")[0];

      // Check if schedule already exists for this date
      const { data: existingSchedule } = await supabase
        .from("daily_schedules")
        .select("*")
        .eq("schedule_date", isoDate)
        .maybeSingle();

      if (existingSchedule) {
        return {
          success: true,
          date: isoDate,
          cached: true,
          previous_day_pending:
            existingSchedule.scheduled_tasks?.previous_day_pending || [],
          schedule: existingSchedule.scheduled_tasks?.schedule || {},
          external_vendor_tasks:
            existingSchedule.scheduled_tasks?.external_vendor_tasks || [],
          material_alerts:
            existingSchedule.scheduled_tasks?.material_alerts || [],
          capacity_warnings:
            existingSchedule.scheduled_tasks?.capacity_warnings || [],
          parallel_opportunities: existingSchedule.parallel_opportunities || [],
          blocked_tasks: existingSchedule.scheduled_tasks?.blocked_tasks || {
            waiting_vendor: [],
            material_shortage: [],
            dependency_pending: [],
          },
          confidence_score: existingSchedule.confidence_score || 1.0,
          message: `Showing cached schedule for ${isoDate}`,
        };
      }

      // Generate new schedule using engine
      const scheduler = new ConstraintScheduler();
      const schedule = await scheduler.generateDailySchedule(scheduleDate);

      // Save to cache
      await supabase.from("daily_schedules").insert({
        schedule_date: isoDate,
        scheduled_tasks: {
          previous_day_pending: schedule.previous_day_pending,
          schedule: schedule.schedule,
          external_vendor_tasks: schedule.external_vendor_tasks,
          material_alerts: schedule.material_alerts,
          capacity_warnings: schedule.capacity_warnings,
          blocked_tasks: schedule.blocked_tasks,
        },
        parallel_opportunities: schedule.parallel_opportunities,
        risk_factors: [
          ...schedule.material_alerts.filter((a) => a.urgency === "critical"),
          ...schedule.blocked_tasks.waiting_vendor.slice(0, 5),
        ],
        confidence_score: schedule.confidence_score,
      });

      return {
        success: true,
        date: isoDate,
        cached: false,
        previous_day_pending: schedule.previous_day_pending,
        schedule: schedule.schedule,
        external_vendor_tasks: schedule.external_vendor_tasks,
        material_alerts: schedule.material_alerts,
        capacity_warnings: schedule.capacity_warnings,
        parallel_opportunities: schedule.parallel_opportunities,
        blocked_tasks: schedule.blocked_tasks,
        confidence_score: schedule.confidence_score,
        message: `Generated new schedule for ${isoDate}`,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error generating daily schedule",
        date: input.date || new Date().toISOString().split("T")[0],
        schedule: {},
        parallel_opportunities: [],
        blocked_tasks: {
          waiting_vendor: [],
          material_shortage: [],
          dependency_pending: [],
        },
      };
    }
  },
});

export const invalidateScheduleCacheTool = tool({
  description: "Clear schedule cache and regenerate fresh schedule for a date",
  inputSchema: z.object({
    date: z
      .string()
      .optional()
      .describe("Date to regenerate (YYYY-MM-DD), defaults to today"),
  }),
  execute: async (input) => {
    try {
      const targetDate = input.date || new Date().toISOString().split("T")[0];

      // 1. Clear cache
      const { error: deleteError } = await supabase
        .from("daily_schedules")
        .delete()
        .eq("schedule_date", targetDate);

      if (deleteError) {
        return {
          success: false,
          error: `Failed to clear cache: ${deleteError.message}`,
        };
      }

      // 2. Immediately regenerate fresh schedule
      const scheduleDate = new Date(targetDate);
      const scheduler = new ConstraintScheduler();
      const schedule = await scheduler.generateDailySchedule(scheduleDate);

      // 3. DO NOT save to cache - let next request do that
      // This ensures "cached: false" is always shown after invalidation

      return {
        success: true,
        date: targetDate,
        cached: false,
        previous_day_pending: schedule.previous_day_pending,
        schedule: schedule.schedule,
        external_vendor_tasks: schedule.external_vendor_tasks,
        material_alerts: schedule.material_alerts,
        capacity_warnings: schedule.capacity_warnings,
        parallel_opportunities: schedule.parallel_opportunities,
        blocked_tasks: schedule.blocked_tasks,
        confidence_score: schedule.confidence_score,
        message: `✅ Cache cleared and fresh schedule generated for ${targetDate}`,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to regenerate schedule",
      };
    }
  },
});

// ========== KEEP YOUR ORIGINAL TOOLS BELOW ==========

export const identifyBottlenecksTool = tool({
  description: "Identifies bottleneck tasks that may delay project completion.",
  inputSchema: z.object({
    projectId: z.string(),
  }),
  execute: async ({ projectId }) => {
    try {
      const { data: tasks, error } = await supabase
        .from("tasks")
        .select("id, name, status, depends_on, due_date")
        .eq("project_id", projectId)
        .in("status", ["pending", "blocked"])
        .order("due_date");

      if (error)
        return { success: false, error: error.message, bottlenecks: [] };
      if (!tasks || tasks.length === 0)
        return { success: true, bottlenecks: [] };

      const bottlenecks = tasks
        .filter((task) => task.depends_on && task.status !== "completed")
        .map((task) => ({
          taskId: task.id,
          taskName: task.name,
          reason: "Pending dependencies",
        }));

      return { success: true, bottlenecks };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error identifying bottlenecks",
        bottlenecks: [],
      };
    }
  },
});

export const optimizeTaskOrderTool = tool({
  description:
    "Optimizes the order of tasks based on dependencies and priorities.",
  inputSchema: z.object({
    projectId: z.string(),
  }),
  execute: async ({ projectId }) => {
    try {
      const { data: tasks, error } = await supabase
        .from("tasks")
        .select("id, name, depends_on, priority")
        .eq("project_id", projectId);

      if (error)
        return { success: false, error: error.message, orderedTaskIds: [] };
      if (!tasks || tasks.length === 0)
        return { success: true, orderedTaskIds: [] };

      // Basic topological sort for dependencies
      const graph = new Map<string, string[]>();
      const incomingEdges = new Map<string, number>();

      tasks.forEach((task) => {
        graph.set(task.id, []);
        incomingEdges.set(task.id, 0);
      });

      tasks.forEach((task) => {
        if (task.depends_on) {
          if (!graph.has(task.depends_on)) graph.set(task.depends_on, []);
          graph.get(task.depends_on)?.push(task.id);
          incomingEdges.set(task.id, (incomingEdges.get(task.id) || 0) + 1);
        }
      });

      const queue: string[] = [];
      incomingEdges.forEach((count, id) => {
        if (count === 0) queue.push(id);
      });

      const orderedTaskIds: string[] = [];

      while (queue.length > 0) {
        const current = queue.shift()!;
        orderedTaskIds.push(current);
        graph.get(current)?.forEach((dep) => {
          incomingEdges.set(dep, (incomingEdges.get(dep) || 0) - 1);
          if (incomingEdges.get(dep) === 0) queue.push(dep);
        });
      }

      if (orderedTaskIds.length !== tasks.length) {
        return {
          success: false,
          error: "Cycle detected in dependencies",
          orderedTaskIds: [],
        };
      }

      return { success: true, orderedTaskIds };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error optimizing task order",
        orderedTaskIds: [],
      };
    }
  },
});

export const getRecommendationsTool = tool({
  description: "Generates recommendations to improve project performance.",
  inputSchema: z.object({
    projectId: z.string(),
  }),
  execute: async ({ projectId }) => {
    try {
      const { data: tasks, error } = await supabase
        .from("tasks")
        .select("id, name, status, due_date")
        .eq("project_id", projectId);

      if (error)
        return { success: false, error: error.message, recommendations: [] };
      if (!tasks) return { success: true, recommendations: [] };

      const recommendations = tasks
        .filter(
          (t) =>
            t.status === "blocked" ||
            (t.due_date && new Date(t.due_date) < new Date())
        )
        .map((t) => `Consider speeding up task: ${t.name}`);

      return { success: true, recommendations };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error generating recommendations",
        recommendations: [],
      };
    }
  },
});

export const analyzeProjectHealthTool = tool({
  description:
    "Analyzes overall health metrics of a project such as progress and costs.",
  inputSchema: z.object({
    projectId: z.string(),
  }),
  execute: async ({ projectId }) => {
    try {
      const { data: allTasks } = await supabase
        .from("tasks")
        .select("id, status")
        .eq("project_id", projectId);

      if (!allTasks || allTasks.length === 0) {
        return {
          success: false,
          error: "No tasks found for this project",
        };
      }

      const completedTasks = allTasks.filter((t) => t.status === "completed");
      const percentComplete = (completedTasks.length / allTasks.length) * 100;

      const costVariance = 0; // Placeholder

      const riskWarnings: string[] = [];
      if (percentComplete < 50)
        riskWarnings.push("Less than 50% task completion");
      if (costVariance > 10)
        riskWarnings.push("Cost variance greater than 10%");

      return {
        success: true,
        percentComplete: Math.round(percentComplete),
        costVariance,
        riskWarnings,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error analyzing project health",
      };
    }
  },
});
