import { supabase } from './supabase';
import { Task, ScheduledTask, ParallelWork, Constraint, OptimizedSchedule } from './scheduler-types';

export class ConstraintScheduler {
  private dependencyGraph: Map<string, string[]> = new Map();

  async generateDailySchedule(date: Date): Promise<OptimizedSchedule> {
    console.log('🚀 Generating optimized schedule for:', date);
    
    try {
      // 1. Load pending tasks with dependencies
      const pendingTasks = await this.loadPendingTasks();
      
      // 2. Build dependency graph
      this.buildDependencyGraph(pendingTasks);
      
      // 3. Check all constraints
      const constraints = await this.checkAllConstraints(pendingTasks);
      
      // 4. Optimize schedule
      const optimizedTasks = this.optimizeTaskSequence(pendingTasks, constraints);
      
      // 5. Find parallel work opportunities
      const parallelWork = this.findParallelOpportunities(optimizedTasks);
      
      return {
        date: date.toISOString().split('T')[0],
        tasks: optimizedTasks,
        parallelOpportunities: parallelWork,
        riskFactors: constraints.filter(c => c.severity === 'blocker'),
        confidenceScore: this.calculateConfidence(optimizedTasks, constraints)
      };
    } catch (error) {
      console.error('Scheduler error:', error);
      throw error;
    }
  }

  private async loadPendingTasks(): Promise<Task[]> {
    const { data: tasks, error } = await supabase
      .from('project_tasks')
      .select(`
        *,
        task_templates (
          name,
          typical_time_hours,
          dependencies,
          required_skills,
          required_materials
        )
      `)
      .in('status', ['pending', 'postponed'])
      .order('created_at');

    if (error) throw error;
    
    return (tasks || []).map(task => ({
      id: task.id,
      name: task.task_templates?.name || 'Unknown Task',
      project_id: task.project_id,
      template_id: task.template_id,
      estimated_hours: task.task_templates?.typical_time_hours || 1,
      dependencies: task.task_templates?.dependencies || [],
      assigned_to: task.assigned_to,
      status: task.status,
      required_materials: task.task_templates?.required_materials || [],
      required_skills: task.task_templates?.required_skills || []
    }));
  }

  private buildDependencyGraph(tasks: Task[]) {
    this.dependencyGraph.clear();
    
    tasks.forEach(task => {
      this.dependencyGraph.set(task.id, task.dependencies || []);
    });
  }

  private async checkAllConstraints(tasks: Task[]): Promise<Constraint[]> {
    const constraints: Constraint[] = [];
    
    // Check material constraints
    for (const task of tasks) {
      for (const material of task.required_materials) {
        const { data: stock } = await supabase
          .from('materials')
          .select('current_stock, minimum_stock')
          .eq('name', material.material)
          .single();

        if (stock && stock.current_stock < material.quantity) {
          constraints.push({
            type: 'material',
            message: `Insufficient ${material.material} for task "${task.name}"`,
            severity: stock.current_stock < stock.minimum_stock ? 'blocker' : 'warning'
          });
        }
      }
    }
    
    return constraints;
  }

  private optimizeTaskSequence(tasks: Task[], constraints: Constraint[]): ScheduledTask[] {
    // Filter out tasks blocked by constraints
    const feasibleTasks = tasks.filter(task => 
      !constraints.some(c => 
        c.severity === 'blocker' && 
        c.message.includes(task.name)
      )
    );

    // Topological sort based on dependencies
    const sortedTasks = this.topologicalSort(feasibleTasks);
    
    // Assign time slots
    const scheduled: ScheduledTask[] = [];
    let currentTime = '09:30';
    
    sortedTasks.forEach(task => {
      const endTime = this.addHours(currentTime, task.estimated_hours);
      
      scheduled.push({
        task,
        startTime: currentTime,
        endTime,
        assignedTo: task.assigned_to,
        dependencies: task.dependencies
      });
      
      currentTime = endTime;
    });
    
    return scheduled;
  }

  private findParallelOpportunities(tasks: ScheduledTask[]): ParallelWork[] {
    const opportunities: ParallelWork[] = [];
    
    for (let i = 0; i < tasks.length; i++) {
      for (let j = i + 1; j < tasks.length; j++) {
        const taskA = tasks[i];
        const taskB = tasks[j];
        
        if (!this.tasksConflict(taskA, taskB)) {
          opportunities.push({
            mainTask: taskA.task.name,
            parallelTask: taskB.task.name,
            reason: 'Different resources and no dependencies'
          });
        }
      }
    }
    
    return opportunities;
  }

  private topologicalSort(tasks: Task[]): Task[] {
    const visited = new Set<string>();
    const stack: Task[] = [];
    
    const visit = (task: Task) => {
      if (visited.has(task.id)) return;
      visited.add(task.id);
      
      task.dependencies?.forEach(depId => {
        const depTask = tasks.find(t => t.id === depId);
        if (depTask) visit(depTask);
      });
      
      stack.push(task);
    };
    
    tasks.forEach(task => {
      if (!visited.has(task.id)) visit(task);
    });
    
    return stack.reverse();
  }

  private tasksConflict(taskA: ScheduledTask, taskB: ScheduledTask): boolean {
    const sharedDeps = taskA.dependencies.filter(dep => 
      taskB.dependencies.includes(dep)
    );
    const sameAssignee = taskA.assignedTo === taskB.assignedTo;
    return sharedDeps.length > 0 || sameAssignee;
  }

  private addHours(time: string, hours: number): string {
    const [h, m] = time.split(':').map(Number);
    const totalMinutes = h * 60 + m + hours * 60;
    const newH = Math.floor(totalMinutes / 60) % 24;
    const newM = totalMinutes % 60;
    return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
  }

  private calculateConfidence(tasks: ScheduledTask[], constraints: Constraint[]): number {
    const blockerCount = constraints.filter(c => c.severity === 'blocker').length;
    const taskCount = tasks.length;
    
    if (blockerCount > 0) return 0.3;
    if (taskCount === 0) return 0;
    
    return Math.max(0.1, 1 - (blockerCount / taskCount));
  }
}