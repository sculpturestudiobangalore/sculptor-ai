import { tool } from "ai";
import { z } from "zod";
import { supabase } from "@/lib/supabase"; // Use shared client
import { TASK_TEMPLATES } from "@/lib/ai-tools/utilities/task-templates";

// Helper function for input sanitization
const sanitizeSearch = (input: string): string => {
  return input.trim().replace(/[%_]/g, "\\$&");
};

// Helper function to find project by name
const findProjectByName = async (projectName: string) => {
  const sanitized = sanitizeSearch(projectName);
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, status")
    .ilike("name", `%${sanitized}%`)
    .limit(5);

  if (error) throw new Error(`Database error: ${error.message}`);
  return data;
};

export const listProjectTasksTool = tool({
  description:
    "List all tasks for a specific project with their current status and progress. Use when: User says 'show tasks', 'list tasks for [project]', 'what are the tasks'. Can filter by status (pending/in_progress/completed/blocked). ALWAYS call this for fresh task data. Examples: 'show tasks for ABC project', 'list all pending tasks for Mumbai Museum'.",
  inputSchema: z.object({
    projectName: z.string().describe("Project name (partial match supported)"),
    status: z
      .enum(["pending", "in_progress", "completed", "blocked"])
      .optional()
      .describe("Filter by task status"),
  }),
  execute: async (input) => {
    try {
      const projects = await findProjectByName(input.projectName);

      if (!projects || projects.length === 0) {
        return {
          success: false,
          error: `No projects found matching "${input.projectName}"`,
        };
      }

      if (projects.length > 1) {
        return {
          success: false,
          multipleMatches: true,
          matches: projects,
          error: "Multiple projects found. Please specify which project:",
        };
      }

      const project = projects[0];
      let query = supabase
        .from("tasks")
        .select(
          "id, name, status, estimated_hours, sequence_order, assigned_to"
        )
        .eq("project_id", project.id)
        .order("sequence_order", { ascending: true });

      if (input.status) {
        query = query.eq("status", input.status);
      }

      const { data: tasksData, error: tasksError } = await query;

      if (tasksError) {
        return {
          success: false,
          error: `Failed to fetch tasks: ${tasksError.message}`,
        };
      }

      const tasks = tasksData || [];
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(
        (t: any) => t.status === "completed"
      ).length;
      const inProgressTasks = tasks.filter(
        (t: any) => t.status === "in_progress"
      ).length;

      return {
        success: true,
        project: { id: project.id, name: project.name, status: project.status },
        tasks: tasks,
        summary: {
          total: totalTasks,
          completed: completedTasks,
          inProgress: inProgressTasks,
          pending: totalTasks - completedTasks - inProgressTasks,
          progress:
            totalTasks > 0
              ? Math.round((completedTasks / totalTasks) * 100)
              : 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list tasks",
      };
    }
  },
});

export const updateTaskStatusTool = tool({
  description:
    "Update the status of a specific task. Use when: User says 'mark task as [status]', 'change task status', 'complete task', 'task is done'. Automatically handles dependencies and tracks progress. Examples: 'mark site survey as completed', 'change task status to in progress for foundation work'.",
  inputSchema: z.object({
    projectName: z.string().describe("Project name"),
    taskName: z.string().describe("Task name (partial match supported)"),
    status: z
      .enum(["pending", "in_progress", "completed", "blocked"])
      .describe("New status"),
  }),
  execute: async (input) => {
    try {
      const projects = await findProjectByName(input.projectName);

      if (!projects || projects.length === 0) {
        return {
          success: false,
          error: `No projects found matching "${input.projectName}"`,
        };
      }

      if (projects.length > 1) {
        return {
          success: false,
          multipleMatches: true,
          matches: projects,
          error: "Multiple projects found. Please specify which project:",
        };
      }

      const project = projects[0];
      const sanitizedTaskName = sanitizeSearch(input.taskName);

      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("id, name, status")
        .eq("project_id", project.id)
        .ilike("name", `%${sanitizedTaskName}%`)
        .limit(5);

      if (tasksError) {
        return {
          success: false,
          error: `Failed to search tasks: ${tasksError.message}`,
        };
      }

      if (!tasksData || tasksData.length === 0) {
        return {
          success: false,
          error: `No tasks found matching "${input.taskName}" in project "${project.name}"`,
        };
      }

      if (tasksData.length > 1) {
        return {
          success: false,
          multipleMatches: true,
          matches: tasksData,
          error: "Multiple tasks found. Please specify which task:",
        };
      }

      const task = tasksData[0];
      const updates: any = {
        status: input.status,
        updated_at: new Date().toISOString(),
      };

      // Set completed_at when marking as completed
      if (input.status === "completed") {
        updates.completed_at = new Date().toISOString();
        updates.actual_hours = updates.actual_hours || 0; // preserve if set
      }

      const { error: updateError } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", task.id);

      if (updateError) {
        return {
          success: false,
          error: `Failed to update task: ${updateError.message}`,
        };
      }

      // Invalidate schedule cache when task status changes
      if (input.status === "completed" || input.status === "in_progress") {
        await supabase
          .from("daily_schedules")
          .delete()
          .eq("schedule_date", new Date().toISOString().split("T")[0]);
      }

      if (input.status === "completed" || input.status === "in_progress") {
        // Invalidate schedule cache for today and future
        await supabase
          .from("daily_schedules")
          .delete()
          .gte("schedule_date", new Date().toISOString().split("T")[0]);
      }

      return {
        success: true,
        task: {
          id: task.id,
          name: task.name,
          oldStatus: task.status,
          newStatus: input.status,
          project: project.name,
        },
        message: `Task "${task.name}" updated from ${task.status} to ${input.status}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update task",
      };
    }
  },
});

export const assignTaskTool = tool({
  description:
    "Assign or reassign a task to a team member. Shows current assignee from template.",
  inputSchema: z.object({
    projectName: z.string().describe("Project name"),
    taskName: z.string().describe("Task name"),
    assignTo: z
      .enum(["dhanush", "john", "pannu", "kutti", "chotu", "pinto"])
      .optional()
      .describe(
        "Team member to assign. Leave blank to see current assignment."
      ),
  }),
  execute: async (input) => {
    try {
      const projects = await findProjectByName(input.projectName);

      if (!projects || projects.length === 0) {
        return {
          success: false,
          error: `No projects found matching "${input.projectName}"`,
        };
      }

      if (projects.length > 1) {
        return {
          success: false,
          multipleMatches: true,
          matches: projects,
          error: "Multiple projects found. Please specify which project:",
        };
      }

      const project = projects[0];
      const sanitizedTaskName = sanitizeSearch(input.taskName);

      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("id, name, assigned_to")
        .eq("project_id", project.id)
        .ilike("name", `%${sanitizedTaskName}%`)
        .limit(5);

      if (tasksError) {
        return {
          success: false,
          error: `Failed to search tasks: ${tasksError.message}`,
        };
      }

      if (!tasksData || tasksData.length === 0) {
        return {
          success: false,
          error: `No tasks found matching "${input.taskName}" in project "${project.name}"`,
        };
      }

      if (tasksData.length > 1) {
        return {
          success: false,
          multipleMatches: true,
          matches: tasksData,
          error: "Multiple tasks found. Please specify which task:",
        };
      }

      const task = tasksData[0];

      // If no assignTo provided, just show current assignment
      if (!input.assignTo) {
        return {
          success: true,
          viewOnly: true,
          task: {
            id: task.id,
            name: task.name,
            currentAssignee: task.assigned_to || "Unassigned",
            project: project.name,
          },
          message: `Task "${task.name}" is currently assigned to: ${
            task.assigned_to || "Unassigned (default from template)"
          }`,
        };
      }

      // Otherwise, update assignment
      const { error: updateError } = await supabase
        .from("tasks")
        .update({
          assigned_to: input.assignTo.toLowerCase(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", task.id);

      if (updateError) {
        return {
          success: false,
          error: `Failed to assign task: ${updateError.message}`,
        };
      }

      return {
        success: true,
        task: {
          id: task.id,
          name: task.name,
          oldAssignee: task.assigned_to || "Unassigned",
          newAssignee: input.assignTo,
          project: project.name,
        },
        message: `Task "${task.name}" ${
          task.assigned_to
            ? `reassigned from ${task.assigned_to} to`
            : "assigned to"
        } ${input.assignTo}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to assign task",
      };
    }
  },
});

export const createTaskTool = tool({
  description:
    "Create a new task for a project. Use when: User says 'add task', 'create task', 'new task for [project]'. Specify project name, task name, estimated hours, and optional assignee. Examples: 'add welding task to ABC project assigned to John', 'create a new painting task'.",
  inputSchema: z.object({
    projectName: z.string().describe("Project name"),
    taskName: z.string().describe("Name of the new task"),
    estimatedHours: z
      .number()
      .min(0.5)
      .max(100)
      .optional()
      .describe("Estimated hours to complete"),
    assignedTo: z
      .enum(["dhanush", "john", "pannu", "kutti", "chotu", "pinto"])
      .optional()
      .describe("Team member to assign"),
    dependsOn: z
      .string()
      .uuid()
      .optional()
      .describe("Task ID this task depends on"),
  }),
  execute: async (input) => {
    try {
      const projects = await findProjectByName(input.projectName);

      if (!projects || projects.length === 0) {
        return {
          success: false,
          error: `No projects found matching "${input.projectName}"`,
        };
      }

      if (projects.length > 1) {
        return {
          success: false,
          multipleMatches: true,
          matches: projects,
          error: "Multiple projects found. Please specify which project:",
        };
      }

      const project = projects[0];

      // Get the highest sequence order to place new task at the end
      const { data: lastTask, error: sequenceError } = await supabase
        .from("tasks")
        .select("sequence_order")
        .eq("project_id", project.id)
        .order("sequence_order", { ascending: false })
        .limit(1);

      if (sequenceError) {
        return {
          success: false,
          error: `Failed to get task sequence: ${sequenceError.message}`,
        };
      }

      const nextSequence = (lastTask?.[0]?.sequence_order || 0) + 1;

      const { data: newTask, error: createError } = await supabase
        .from("tasks")
        .insert({
          project_id: project.id,
          name: input.taskName,
          status: "pending",
          estimated_hours: input.estimatedHours || 2,
          assigned_to: input.assignedTo || null,
          depends_on: input.dependsOn || null,
          sequence_order: nextSequence,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        return {
          success: false,
          error: `Failed to create task: ${createError.message}`,
        };
      }

      return {
        success: true,
        task: {
          id: newTask.id,
          name: newTask.name,
          project: project.name,
          status: newTask.status,
          estimatedHours: newTask.estimated_hours,
          assignedTo: newTask.assigned_to,
          sequence: newTask.sequence_order,
        },
        message: `Task "${input.taskName}" created successfully in project "${project.name}"`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create task",
      };
    }
  },
});

export const getTaskDetailsTool = tool({
  description: "Get detailed information about a specific task",
  inputSchema: z.object({
    projectName: z.string().describe("Project name"),
    taskName: z.string().describe("Task name (partial match supported)"),
  }),
  execute: async (input) => {
    try {
      const projects = await findProjectByName(input.projectName);

      if (!projects || projects.length === 0) {
        return {
          success: false,
          error: `No projects found matching "${input.projectName}"`,
        };
      }

      if (projects.length > 1) {
        return {
          success: false,
          multipleMatches: true,
          matches: projects,
          error: "Multiple projects found. Please specify which project:",
        };
      }

      const project = projects[0];
      const sanitizedTaskName = sanitizeSearch(input.taskName);

      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select(
          `
          id, name, status, estimated_hours, actual_hours, 
          sequence_order, assigned_to, depends_on, notes,
          created_at, updated_at, completed_at
        `
        )
        .eq("project_id", project.id)
        .ilike("name", `%${sanitizedTaskName}%`)
        .limit(5);

      if (tasksError) {
        return {
          success: false,
          error: `Failed to search tasks: ${tasksError.message}`,
        };
      }

      if (!tasksData || tasksData.length === 0) {
        return {
          success: false,
          error: `No tasks found matching "${input.taskName}" in project "${project.name}"`,
        };
      }

      if (tasksData.length > 1) {
        return {
          success: false,
          multipleMatches: true,
          matches: tasksData,
          error: "Multiple tasks found. Please specify which task:",
        };
      }

      const task = tasksData[0];

      return {
        success: true,
        task: {
          id: task.id,
          name: task.name,
          status: task.status,
          estimatedHours: task.estimated_hours,
          actualHours: task.actual_hours,
          assignedTo: task.assigned_to,
          sequence: task.sequence_order,
          dependsOn: task.depends_on,
          notes: task.notes,
          createdAt: task.created_at,
          updatedAt: task.updated_at,
          completedAt: task.completed_at,
          project: project.name,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get task details",
      };
    }
  },
});

export const updateTasksUpToTool = tool({
  description:
    "Update ALL tasks up to and including a specific task name to a new status. This updates MULTIPLE tasks in SEQUENCE ORDER, not just the one task mentioned. Use this when user says 'mark all tasks up to X as completed' or 'complete tasks until Y'. Example: 'mark tasks up to Moulding as completed' will mark: 1) all tasks BEFORE Moulding, AND 2) Moulding itself - all in one operation.",
  inputSchema: z.object({
    projectName: z.string().describe("Project name"),
    upToTaskName: z
      .string()
      .describe(
        "Task name to update up to (inclusive - this task AND all previous tasks will be updated)"
      ),
    status: z
      .enum(["pending", "in_progress", "completed", "blocked", "approved"])
      .describe(
        "New status for ALL tasks up to and including the specified task"
      ),
    notes: z.string().optional().describe("Optional notes for the bulk update"),
  }),
  execute: async (input) => {
    try {
      console.log("📊 [updateTasksUpToTool] STARTING BULK UPDATE:", input);

      // STEP 1: Find project
      const { data: projects, error: projectError } = await supabase
        .from("projects")
        .select("id, name")
        .ilike("name", `%${input.projectName}%`)
        .limit(1);

      if (projectError || !projects || projects.length === 0) {
        console.error("❌ Project not found:", input.projectName);
        return {
          success: false,
          error: `Project "${input.projectName}" not found`,
        };
      }

      const projectId = projects[0].id;
      console.log(`✅ Found project: ${projects[0].name} (${projectId})`);

      // STEP 2: Get all tasks for the project
      const { data: allTasks, error: tasksError } = await supabase
        .from("tasks")
        .select("id, name, status, sequence_order")
        .eq("project_id", projectId)
        .order("sequence_order", { ascending: true });

      if (tasksError || !allTasks || allTasks.length === 0) {
        console.error("❌ No tasks found");
        return {
          success: false,
          error: `No tasks found for project "${input.projectName}"`,
        };
      }

      console.log(`📋 Found ${allTasks.length} total tasks`);

      // STEP 3: Find the target task with improved matching
      const normalizeTaskName = (name: string) =>
        name.toLowerCase().trim().replace(/\s+/g, " ");

      const normalizedSearch = normalizeTaskName(input.upToTaskName);
      console.log(
        `🔍 Searching for: "${input.upToTaskName}" (normalized: "${normalizedSearch}")`
      );

      const targetTask = allTasks.find((t) =>
        normalizeTaskName(t.name || "").includes(normalizedSearch)
      );

      if (!targetTask) {
        console.error("❌ Target task not found");
        return {
          success: false,
          error: `Task "${input.upToTaskName}" not found in project`,
          availableTasks: allTasks.map((t) => t.name),
        };
      }

      console.log(
        `✅ Found target: "${targetTask.name}" at sequence ${targetTask.sequence_order}`
      );

      // STEP 4: Get all tasks up to and including target task
      const tasksToUpdate = allTasks.filter(
        (t) => t.sequence_order! <= targetTask.sequence_order!
      );

      if (tasksToUpdate.length === 0) {
        console.error("❌ No tasks to update (filter returned empty)");
        return {
          success: false,
          error: "No tasks found to update",
        };
      }

      console.log(
        `📝 Will update ${tasksToUpdate.length} tasks:`,
        tasksToUpdate.map((t) => `"${t.name}"`).join(", ")
      );

      // STEP 5: Prepare update data
      const updateData: any = {
        status: input.status,
        updated_at: new Date().toISOString(),
      };

      if (input.status === "completed") {
        updateData.completed_at = new Date().toISOString();
      }

      if (input.notes) {
        updateData.notes = input.notes;
      }

      const taskIds = tasksToUpdate.map((t) => t.id);
      console.log(
        `🔄 Updating ${taskIds.length} task IDs to status "${input.status}"`
      );

      // STEP 6: Execute bulk update with better error handling
      const { data: updatedTasks, error: updateError } = await supabase
        .from("tasks")
        .update(updateData)
        .in("id", taskIds)
        .select("id, name, status");

      if (updateError) {
        console.error("❌ Update failed:", updateError);
        return {
          success: false,
          error: `Failed to update tasks: ${updateError.message}`,
          details: updateError,
        };
      }

      console.log(
        `✅ Successfully updated ${
          updatedTasks?.length || taskIds.length
        } tasks`
      );

      // STEP 7: Recalculate project progress
      const completedTasks = allTasks.filter(
        (t) =>
          t.status === "completed" ||
          (taskIds.includes(t.id) && input.status === "completed")
      ).length;

      const progress = Math.round((completedTasks / allTasks.length) * 100);

      await supabase
        .from("projects")
        .update({ progress_percentage: progress })
        .eq("id", projectId);

      console.log(`📊 Project progress updated to ${progress}%`);

      return {
        success: true,
        tasksUpdated: tasksToUpdate.length,
        updatedTasks: tasksToUpdate.map((t) => t.name),
        newStatus: input.status,
        projectProgress: progress,
        message: `✅ Successfully updated ${
          tasksToUpdate.length
        } tasks (${tasksToUpdate
          .map((t) => `"${t.name}"`)
          .join(", ")}) to status "${
          input.status
        }". Project is now ${progress}% complete.`,
      };
    } catch (error) {
      console.error("❌ [updateTasksUpToTool] CRITICAL ERROR:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update tasks",
        stack: error instanceof Error ? error.stack : undefined,
      };
    }
  },
});

export const assignTasksToDefaultsTool = tool({
  description:
    "Assign all tasks in a project to their default workers and durations from task templates",
  inputSchema: z.object({
    projectName: z.string().describe("Project name"),
  }),
  execute: async (input) => {
    try {
      // 1. Find project
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("id, name, project_type")
        .ilike("name", input.projectName)
        .single();

      if (projectError || !project) {
        return {
          success: false,
          error: `Project "${input.projectName}" not found`,
        };
      }

      // 2. Get all tasks for this project
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("id, name, assigned_to, estimated_hours")
        .eq("project_id", project.id)
        .order("sequence_order");

      if (tasksError) {
        return {
          success: false,
          error: `Failed to fetch tasks: ${tasksError.message}`,
        };
      }

      if (!tasks || tasks.length === 0) {
        return {
          success: false,
          error: `No tasks found for project "${project.name}"`,
        };
      }

      // 3. Get task templates for this project type
      const projectType = project.project_type || "3D";
      const taskTemplates =
        TASK_TEMPLATES[projectType as keyof typeof TASK_TEMPLATES] ||
        TASK_TEMPLATES["3D"];

      // 4. Match tasks to templates and update workers + duration
      let updatedCount = 0;
      const updates: any[] = [];

      for (const task of tasks) {
        // Find matching template by name
        const template = taskTemplates.find(
          (t: any) =>
            task.name.toLowerCase().includes(t.name.toLowerCase()) ||
            t.name.toLowerCase().includes(task.name.toLowerCase())
        );

        if (template) {
          const updateData: any = {
            updated_at: new Date().toISOString(),
          };

          // Set worker if template has one
          if (template.assigned_to) {
            updateData.assigned_to = template.assigned_to.map((w) =>
              w.toLowerCase()
            );
          }

          // Set duration from template
          if (template.estimated_minutes) {
            updateData.estimated_hours = Number(
              (template.estimated_minutes / 60).toFixed(2)
            );
          }

          // Only update if there's something to change
          if (Object.keys(updateData).length > 1) {
            const { error: updateError } = await supabase
              .from("tasks")
              .update(updateData)
              .eq("id", task.id);

            if (!updateError) {
              updatedCount++;
              updates.push({
                taskName: task.name,
                worker:
                  template.assigned_to || task.assigned_to || "Unassigned",
                previousWorker: task.assigned_to || "Unassigned",
                duration: updateData.estimated_hours || task.estimated_hours,
                previousDuration: task.estimated_hours,
              });
            }
          }
        }
      }

      return {
        success: true,
        message: `Updated ${updatedCount} tasks with default workers and durations for project "${project.name}"`,
        updatedCount,
        totalTasks: tasks.length,
        updates,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to assign defaults",
      };
    }
  },
});

export const completeTaskWithLearningTool = tool({
  description: "Mark task as completed and record actual hours for AI learning",
  inputSchema: z.object({
    projectName: z.string().describe("Project name"),
    taskName: z.string().describe("Task name"),
    actualHours: z.number().describe("Actual hours taken to complete the task"),
  }),
  execute: async (input) => {
    try {
      // Find project
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("id, name")
        .ilike("name", input.projectName)
        .maybeSingle();

      if (projectError || !project) {
        return {
          success: false,
          error: `Project "${input.projectName}" not found`,
        };
      }

      // Find task
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .select("id, name, estimated_hours")
        .eq("project_id", project.id)
        .ilike("name", `%${input.taskName}%`)
        .maybeSingle();

      if (taskError || !task) {
        return {
          success: false,
          error: `Task "${input.taskName}" not found in project "${project.name}"`,
        };
      }

      // Update task with completion and actual hours
      const { error: updateError } = await supabase
        .from("tasks")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          actual_hours: input.actualHours,
          updated_at: new Date().toISOString(),
        })
        .eq("id", task.id);

      if (updateError) {
        return {
          success: false,
          error: `Failed to update task: ${updateError.message}`,
        };
      }

      // Invalidate schedule cache for today and future
      await supabase
        .from("daily_schedules")
        .delete()
        .gte("schedule_date", new Date().toISOString().split("T")[0]);

      // Calculate variance for learning
      const variance = input.actualHours - task.estimated_hours;
      const variancePercent = ((variance / task.estimated_hours) * 100).toFixed(
        1
      );

      return {
        success: true,
        task: {
          id: task.id,
          name: task.name,
          estimated_hours: task.estimated_hours,
          actual_hours: input.actualHours,
          variance: variance,
          variance_percent: variancePercent,
          project: project.name,
        },
        message: `✅ Task "${task.name}" completed in ${input.actualHours}h (estimated: ${task.estimated_hours}h, variance: ${variancePercent}%)`,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to complete task",
      };
    }
  },
});

export const updateTaskTool = tool({
  description:
    "Update task details including name, description, hours, assignee, and dependencies",
  inputSchema: z.object({
    projectName: z.string().describe("Project name"),
    taskName: z
      .string()
      .describe("Current task name (partial match supported)"),
    newTaskName: z.string().optional().describe("New name for the task"),
    description: z.string().optional().describe("Task description or notes"),
    estimatedHours: z.number().optional().describe("Estimated hours"),
    assignedTo: z
      .enum(["dhanush", "john", "pannu", "kutti", "chotu", "pinto"])
      .optional()
      .describe("Assignee"),
    status: z
      .enum(["pending", "in_progress", "completed", "blocked"])
      .optional()
      .describe("Status"),
    dependsOn: z
      .string()
      .uuid()
      .optional()
      .describe("Task ID this task depends on"),
  }),
  execute: async (input) => {
    try {
      const projects = await findProjectByName(input.projectName);

      if (!projects || projects.length === 0) {
        return {
          success: false,
          error: `No projects found matching "${input.projectName}"`,
        };
      }

      if (projects.length > 1) {
        return {
          success: false,
          multipleMatches: true,
          matches: projects,
          error: "Multiple projects found. Please specify which project:",
        };
      }

      const project = projects[0];
      const sanitizedTaskName = sanitizeSearch(input.taskName);

      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", project.id)
        .ilike("name", `%${sanitizedTaskName}%`)
        .limit(5);

      if (tasksError) {
        return {
          success: false,
          error: `Failed to search tasks: ${tasksError.message}`,
        };
      }

      if (!tasksData || tasksData.length === 0) {
        return {
          success: false,
          error: `No tasks found matching "${input.taskName}" in project "${project.name}"`,
        };
      }

      if (tasksData.length > 1) {
        return {
          success: false,
          multipleMatches: true,
          matches: tasksData,
          error: "Multiple tasks found. Please specify which task:",
        };
      }

      const task = tasksData[0];
      const updates: any = {
        updated_at: new Date().toISOString(),
      };

      if (input.newTaskName) updates.name = input.newTaskName;
      if (input.description) updates.notes = input.description; // Mapping description to notes
      if (input.estimatedHours) updates.estimated_hours = input.estimatedHours;
      if (input.assignedTo) updates.assigned_to = input.assignedTo;
      if (input.status) updates.status = input.status;
      if (input.dependsOn) updates.depends_on = input.dependsOn;

      // Handle completion timestamp
      if (input.status === "completed" && task.status !== "completed") {
        updates.completed_at = new Date().toISOString();
      } else if (input.status && input.status !== "completed") {
        updates.completed_at = null;
      }

      const { error: updateError } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", task.id);

      if (updateError) {
        return {
          success: false,
          error: `Failed to update task: ${updateError.message}`,
        };
      }

      // Invalidate schedule cache if relevant fields changed
      if (
        input.status ||
        input.estimatedHours ||
        input.assignedTo ||
        input.dependsOn
      ) {
        await supabase
          .from("daily_schedules")
          .delete()
          .gte("schedule_date", new Date().toISOString().split("T")[0]);
      }

      return {
        success: true,
        task: {
          id: task.id,
          name: input.newTaskName || task.name,
          project: project.name,
          updates: Object.keys(updates).filter((k) => k !== "updated_at"),
        },
        message: `Task "${task.name}" updated successfully`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update task",
      };
    }
  },
});
