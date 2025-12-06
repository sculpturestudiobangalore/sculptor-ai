import { supabase } from "@/lib/supabase";

export interface Task {
  id: string;
  name: string;
  project_id: string;
  project_name?: string;
  project_budget?: number;
  project_deadline?: string;
  estimated_hours: number;
  actual_hours?: number;
  dependencies: string[];
  assigned_to: string[] | null;
  status: string;
  priority: string;
  due_date?: string;
  sequence_order?: number;
  created_at?: string;
}

export interface ScheduledTask {
  task: Task;
  startTime: string;
  endTime: string;
  assignedTo: string;
}

export interface WorkerSchedule {
  fits_today: ScheduledTask[];
  overflow: Task[];
  total_hours: number;
}

export interface MaterialAlert {
  material: string;
  total_quantity_needed: number;
  current_stock: number;
  tasks: { name: string; project: string; date: string }[];
  order_by_date: string;
  urgency: "critical" | "warning";
}

export interface ExternalVendorTask {
  vendor: string;
  task_name: string;
  project_name: string;
  days_assigned: number;
  expected_completion: string;
  blocking_tasks: string[];
}

export interface BlockedTasks {
  waiting_vendor: Task[];
  material_shortage: Task[];
  dependency_pending: Task[];
}

export interface OptimizedSchedule {
  date: string;
  previous_day_pending: Task[];
  schedule: Record<string, WorkerSchedule>;
  external_vendor_tasks: ExternalVendorTask[];
  material_alerts: MaterialAlert[];
  capacity_warnings: string[];
  parallel_opportunities: { taskA: string; taskB: string; reason: string }[];
  blocked_tasks: BlockedTasks;
  confidence_score: number;
}

export class ConstraintScheduler {
  private async calculateProjectPriority(
    projectId: string,
    budget: number,
    deadline: string | null
  ): Promise<number> {
    // Get completion ratio
    const { data: allTasks } = await supabase
      .from("tasks")
      .select("id, status")
      .eq("project_id", projectId);

    const totalTasks = allTasks?.length || 1;
    const completedTasks =
      allTasks?.filter((t) => t.status === "completed").length || 0;
    const completionRatio = completedTasks / totalTasks;

    // Budget weight (normalize to 0-10)
    const budgetWeight = budget / 100000;

    // Deadline urgency
    let urgencyMultiplier = 1;
    if (deadline) {
      const daysUntilDeadline = Math.ceil(
        (new Date(deadline).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      );
      urgencyMultiplier = Math.max(1, (30 - daysUntilDeadline) / 5);
    }

    // Adjust urgency based on completion (less complete + urgent = higher priority)
    const adjustedUrgency = urgencyMultiplier * (1 + (1 - completionRatio));

    return budgetWeight * adjustedUrgency;
  }

  async generateDailySchedule(date: Date): Promise<OptimizedSchedule> {
    console.log("🚀 Generating optimized schedule for:", date);

    try {
      // 1. Check previous day's pending tasks
      const previousDayPending = await this.checkPreviousDayPending(date);

      // 2. Load actionable tasks (internal, dependencies satisfied)
      const actionableTasks = await this.loadActionableTasks();

      // 3. Load external vendor tasks
      const externalTasks = await this.loadExternalVendorTasks();

      // 4. Check material constraints
      const materialAlerts = await this.checkMaterialConstraints(
        actionableTasks
      );

      // 5. Calculate project priorities and sort tasks
      const sortedTasks = await this.sortTasksByPriority(actionableTasks);

      // 6. Assign tasks to workers with timeline
      const schedule = this.assignTasksToWorkers(sortedTasks, date);

      // 7. Check capacity warnings (7 days ahead)
      const capacityWarnings = await this.checkCapacityWarnings();

      // 8. Find parallel work opportunities
      const parallelOpportunities = this.findParallelOpportunities(schedule);

      // 9. Identify blocked tasks
      const blockedTasks = await this.identifyBlockedTasks();

      // 10. Calculate confidence score
      const confidenceScore = this.calculateConfidence(
        schedule,
        materialAlerts,
        blockedTasks
      );

      return {
        date: date.toISOString().split("T")[0],
        previous_day_pending: previousDayPending,
        schedule,
        external_vendor_tasks: externalTasks,
        material_alerts: materialAlerts,
        capacity_warnings: capacityWarnings,
        parallel_opportunities: parallelOpportunities,
        blocked_tasks: blockedTasks,
        confidence_score: confidenceScore,
      };
    } catch (error) {
      console.error("Scheduler error:", error);
      throw error;
    }
  }

  private async checkPreviousDayPending(currentDate: Date): Promise<Task[]> {
    const yesterday = new Date(currentDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    // Check if yesterday's schedule exists
    const { data: yesterdaySchedule } = await supabase
      .from("daily_schedules")
      .select("scheduled_tasks")
      .eq("schedule_date", yesterdayStr)
      .single();

    if (!yesterdaySchedule) return [];

    // ✅ FIX: Safely access scheduled_tasks - it might be JSON or already an object
    let scheduledTasks = yesterdaySchedule.scheduled_tasks;

    // If it's a string (JSON), parse it
    if (typeof scheduledTasks === "string") {
      try {
        scheduledTasks = JSON.parse(scheduledTasks);
      } catch (e) {
        console.error("Failed to parse scheduled_tasks JSON:", e);
        return [];
      }
    }

    // Ensure it's an array before mapping
    if (!Array.isArray(scheduledTasks)) {
      console.warn("scheduled_tasks is not an array:", typeof scheduledTasks);
      return [];
    }

    // Find tasks from yesterday that are still pending/in_progress
    const scheduledTaskIds = scheduledTasks
      .map((st: any) => st.task?.id)
      .filter(Boolean);

    if (scheduledTaskIds.length === 0) return [];

    const { data: pendingTasks } = await supabase
      .from("tasks")
      .select(
        `
    id, name, status, estimated_hours, project_id,
    projects!inner (name, budget_amount, deadline)
  `
      )
      .in("id", scheduledTaskIds)
      .in("status", ["pending", "in_progress"]);

    return (pendingTasks || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      project_id: t.project_id,
      project_name: t.projects?.[0]?.name || "Unknown",
      project_budget: t.projects?.[0]?.budget_amount,
      project_deadline: t.projects?.[0]?.deadline,
      estimated_hours: t.estimated_hours || 0,
      dependencies: [],
      assigned_to: null,
      status: t.status,
      priority: "medium",
    }));
  }

  private async loadActionableTasks(): Promise<Task[]> {
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select(
        `
      id, 
      name, 
      project_id, 
      estimated_hours, 
      actual_hours,
      depends_on, 
      dependencies, 
      assigned_to, 
      status, 
      priority,
      due_date, 
      sequence_order, 
      created_at,
      projects (
        name, 
        budget_amount, 
        deadline
        )
    
  `
      )

      .in("status", ["pending", "in_progress"])
      .not("assigned_to", "cs", '{"external"}'); // Check if array does NOT contain "external"

    if (error) {
      console.error("❌ Error loading tasks:", error);
      throw error;
    }

    console.log(
      "📊 Raw tasks from DB:",
      tasks?.map((t) => ({
        name: t.name,
        project_id: t.project_id,
        projects: t.projects,
      }))
    );

    // Filter tasks where dependencies are satisfied
    const actionable: Task[] = [];

    for (const task of tasks || []) {
      let canSchedule = true;

      // Check depends_on
      if (task.depends_on) {
        const { data: dep } = await supabase
          .from("tasks")
          .select("status")
          .eq("id", task.depends_on)
          .maybeSingle();

        if (dep && dep.status !== "completed") {
          canSchedule = false;
        }
      }

      if (canSchedule) {
        const projectData = Array.isArray(task.projects)
          ? task.projects[0]
          : task.projects;
        actionable.push({
          id: task.id,
          name: task.name,
          project_id: task.project_id,
          project_name: projectData?.name || "Unknown Project",
          project_budget: projectData?.budget_amount || 0,
          project_deadline: projectData?.deadline,
          estimated_hours: task.estimated_hours || 1,
          actual_hours: task.actual_hours,
          dependencies:
            task.dependencies || (task.depends_on ? [task.depends_on] : []),
          assigned_to: task.assigned_to || ["dhanush"],
          status: task.status,
          priority: task.priority || "medium",
          due_date: task.due_date,
          sequence_order: task.sequence_order || 999,
          created_at: task.created_at,
        });
      }
    }

    console.log(
      "✅ Loaded actionable tasks:",
      actionable.map((t) => ({
        name: t.name,
        project: t.project_name,
      }))
    );

    return actionable;
  }

  private async loadExternalVendorTasks(): Promise<ExternalVendorTask[]> {
    // Only show external tasks that are IN_PROGRESS (actually with vendor)
    const { data: tasks } = await supabase
      .from("tasks")
      .select(
        `
      id, name, created_at, status,
      projects!inner (name)
    `
      )
      .contains("assigned_to", ["external"]) // Check if array contains "external"
      .eq("status", "in_progress"); // Only actively with vendor

    const externalTasks: ExternalVendorTask[] = [];

    for (const task of tasks || []) {
      const daysAssigned = Math.ceil(
        (new Date().getTime() - new Date(task.created_at).getTime()) /
          (1000 * 60 * 60 * 24)
      );

      // Find tasks that depend on this external task
      const { data: dependentTasks } = await supabase
        .from("tasks")
        .select("name")
        .eq("depends_on", task.id);

      externalTasks.push({
        vendor: "External Vendor", // Can enhance later with actual vendor names
        task_name: task.name,
        project_name: task.projects?.[0]?.name || "Unknown",
        days_assigned: daysAssigned,
        expected_completion: "TBD",
        blocking_tasks: (dependentTasks || []).map((t) => t.name),
      });
    }

    return externalTasks;
  }

  private async checkMaterialConstraints(
    tasks: Task[]
  ): Promise<MaterialAlert[]> {
    const alerts: MaterialAlert[] = [];

    // 1. Check for low stock materials (Global check)
    const { data: lowStockMaterials, error } = await supabase
      .from("materials")
      .select("id, name, quantity_available, reorder_level, unit")
      .not("reorder_level", "is", null); // Only check items with reorder level set

    if (error) {
      console.error("❌ Material check error:", error);
      return [];
    }

    // Filter in JS because Supabase filter for column comparison (qty <= reorder) is tricky
    const criticalMaterials = (lowStockMaterials || []).filter(
      (m: any) => m.quantity_available <= (m.reorder_level || 0)
    );

    for (const material of criticalMaterials) {
      alerts.push({
        material: material.name,
        total_quantity_needed: 0, // Not tied to specific task demand in this simple check
        current_stock: material.quantity_available,
        tasks: [], // Global alert, not task specific yet
        order_by_date: new Date().toISOString().split("T")[0],
        urgency: material.quantity_available === 0 ? "critical" : "warning",
      });
    }

    return alerts;
  }

  private async sortTasksByPriority(tasks: Task[]): Promise<Task[]> {
    // Calculate priority score for each project
    const projectScores = new Map<string, number>();

    for (const task of tasks) {
      if (!projectScores.has(task.project_id)) {
        const score = await this.calculateProjectPriority(
          task.project_id,
          task.project_budget || 0,
          task.project_deadline || null
        );
        projectScores.set(task.project_id, score);
      }
    }

    // Sort tasks
    return tasks.sort((a, b) => {
      const scoreA = projectScores.get(a.project_id) || 0;
      const scoreB = projectScores.get(b.project_id) || 0;

      // Primary: Project priority score
      if (scoreB !== scoreA) return scoreB - scoreA;

      // Secondary: Sequence order
      const seqA = a.sequence_order || 999;
      const seqB = b.sequence_order || 999;
      if (seqA !== seqB) return seqA - seqB;

      // Tertiary: Task ID (determinism)
      return a.id.localeCompare(b.id);
    });
  }

  private assignTasksToWorkers(
    tasks: Task[],
    date: Date
  ): Record<string, WorkerSchedule> {
    const schedule: Record<string, WorkerSchedule> = {
      dhanush: { fits_today: [], overflow: [], total_hours: 0 },
      john: { fits_today: [], overflow: [], total_hours: 0 },
    };

    // Check if John works today (Sunday off)
    const isJohnOff = date.getDay() === 0; // 0 = Sunday

    const workerHours: Record<string, number> = {
      dhanush: 8,
      john: isJohnOff ? 0 : 8,
    };

    const workerTime: Record<string, string> = {
      dhanush: "09:30",
      john: "09:30",
    };

    for (const task of tasks) {
      // Handle array of workers - for now, pick the first one or default to dhanush
      const workers =
        task.assigned_to && task.assigned_to.length > 0
          ? task.assigned_to
          : ["dhanush"];
      const worker = workers[0];

      if (!schedule[worker]) {
        schedule[worker] = { fits_today: [], overflow: [], total_hours: 0 };
        workerHours[worker] = 8;
        workerTime[worker] = "09:30";
      }

      const availableHours = workerHours[worker];

      if (availableHours >= task.estimated_hours) {
        const startTime = workerTime[worker];
        const endTime = this.addHours(startTime, task.estimated_hours);

        schedule[worker].fits_today.push({
          task,
          startTime,
          endTime,
          assignedTo: worker,
        });

        workerHours[worker] -= task.estimated_hours;
        workerTime[worker] = endTime;
        schedule[worker].total_hours += task.estimated_hours;
      } else {
        schedule[worker].overflow.push(task);
      }
    }

    return schedule;
  }

  private async checkCapacityWarnings(): Promise<string[]> {
    const warnings: string[] = [];
    // Placeholder for 7-day capacity check
    // TODO: Implement detailed capacity analysis
    return warnings;
  }

  private findParallelOpportunities(
    schedule: Record<string, WorkerSchedule>
  ): { taskA: string; taskB: string; reason: string }[] {
    const opportunities: { taskA: string; taskB: string; reason: string }[] =
      [];

    const workers = Object.keys(schedule);
    if (workers.length < 2) return opportunities;

    // Compare tasks between different workers
    for (let i = 0; i < workers.length; i++) {
      for (let j = i + 1; j < workers.length; j++) {
        const workerA = workers[i];
        const workerB = workers[j];

        const tasksA = schedule[workerA].fits_today.slice(0, 10);
        const tasksB = schedule[workerB].fits_today.slice(0, 10);

        for (const taskA of tasksA) {
          for (const taskB of tasksB) {
            if (this.timeOverlaps(taskA, taskB)) {
              opportunities.push({
                taskA: taskA.task.name,
                taskB: taskB.task.name,
                reason: "Different workers, no dependencies",
              });

              if (opportunities.length >= 10) return opportunities;
            }
          }
        }
      }
    }

    return opportunities;
  }

  private timeOverlaps(taskA: ScheduledTask, taskB: ScheduledTask): boolean {
    const parseTime = (time: string) => {
      const [h, m] = time.split(":").map(Number);
      return h * 60 + m;
    };

    const aStart = parseTime(taskA.startTime);
    const aEnd = parseTime(taskA.endTime);
    const bStart = parseTime(taskB.startTime);
    const bEnd = parseTime(taskB.endTime);

    return aStart < bEnd && aEnd > bStart;
  }

  private async identifyBlockedTasks(): Promise<BlockedTasks> {
    const blocked: BlockedTasks = {
      waiting_vendor: [],
      material_shortage: [],
      dependency_pending: [],
    };

    // ONLY show tasks that are IN_PROGRESS with external vendors
    // (meaning they've actually been sent out and we're waiting)
    const { data: externalTasks } = await supabase
      .from("tasks")
      .select(
        `
      id, name, project_id, estimated_hours,
      projects!inner (name)
    `
      )
      .contains("assigned_to", ["external"]) // Check if array contains "external"
      .eq("status", "in_progress"); // Only in-progress, not pending

    blocked.waiting_vendor = (externalTasks || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      project_id: t.project_id,
      project_name: t.projects?.[0]?.name || "Unknown",
      estimated_hours: t.estimated_hours,
      dependencies: [],
      assigned_to: ["external"],
      status: t.status,
      priority: "medium",
    }));

    // Don't show dependency_pending or material_shortage
    // Those are just natural workflow states, not "blockers"

    return blocked;
  }

  private calculateConfidence(
    schedule: Record<string, WorkerSchedule>,
    materialAlerts: MaterialAlert[],
    blockedTasks: BlockedTasks
  ): number {
    let score = 1.0;

    // Reduce confidence for material issues
    if (materialAlerts.filter((a) => a.urgency === "critical").length > 0) {
      score -= 0.3;
    }

    // Reduce for many blocked tasks
    const totalBlocked =
      blockedTasks.waiting_vendor.length +
      blockedTasks.material_shortage.length +
      blockedTasks.dependency_pending.length;

    if (totalBlocked > 10) score -= 0.2;
    else if (totalBlocked > 5) score -= 0.1;

    return Math.max(0.3, score);
  }

  private addHours(time: string, hours: number): string {
    const [h, m] = time.split(":").map(Number);
    const totalMinutes = h * 60 + m + hours * 60;
    const newH = Math.floor(totalMinutes / 60) % 24;
    const newM = totalMinutes % 60;
    return `${newH.toString().padStart(2, "0")}:${newM
      .toString()
      .padStart(2, "0")}`;
  }
}
