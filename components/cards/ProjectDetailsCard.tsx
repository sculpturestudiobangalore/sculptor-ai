import React from "react";

type ClientInfo = {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
};

type TaskInfo = {
  id?: string;
  name?: string;
  status?: string;
  estimatedHours?: number | null;
  actualHours?: number | null;
  dueDate?: string | null;
  sequenceOrder?: number | null;
};

type MaterialInfo = {
  id?: string;
  name?: string;
  quantity?: number | null;
  used?: number | null;
  unit?: string | null;
  unitCost?: number | null;
  totalCost?: number | null;
};

export type ProjectInfo = {
  id: string;
  name: string;
  status?: string | null;
  deadline?: string | null;
  budget?: number | null;
  totalAmount?: number | null;
  actualCost?: number | null;
  progress?: number; // 0-100
  client?: ClientInfo | null;
  tasks?: TaskInfo[];
  materials?: MaterialInfo[];
  priority?: string | null;
};

// Match your existing cards (same base as ToolCard)
const baseCardStyle =
  "rounded-[28px] border border-white/12 bg-white/10 p-6 text-white/90 backdrop-blur-[70px] shadow-[0_45px_140px_rgba(17,0,58,0.55)]";

// Same gradient bar used in your pipeline card
const gradientBar =
  "bg-gradient-to-r from-[#7c3aed] via-[#a855f7] to-[#ec4899]";

// Status pill styles consistent with your ToolCard
const statusStyles: Record<string, string> = {
  active: "bg-emerald-500/25 text-emerald-100",
  planning: "bg-sky-500/25 text-sky-100",
  completed: "bg-white/15 text-white",
  paused: "bg-amber-500/25 text-amber-100",
};

function formatINR(n?: number | null) {
  if (typeof n !== "number") return "—";
  return n.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(dt);
}

export default function ProjectDetailsCard({
  project,
  onAction
}: {
  project: ProjectInfo
  onAction?: (action: string, data: string) => void
}) {
  const progress = Math.max(0, Math.min(100, project.progress ?? 0));
  const budget = project.budget ?? 0;
  const actual = project.actualCost ?? 0;

  const budgetPct = budget > 0 ? Math.min(100, Math.round((actual / budget) * 100)) : 0;
  const statusKey = (project.status || "").toLowerCase();
  const statusClass = statusStyles[statusKey] ?? "bg-white/15 text-white";

  return (
    <div className={baseCardStyle}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.35em] text-white/45">
            Project intelligence
          </div>
          <h2 className="text-xl font-semibold text-white sm:text-2xl">
            {project.name}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Priority Badge */}
          {/* Assuming priority is available in project object, though not explicitly in ProjectInfo type above. 
                Let's check if we need to add it to type definition first. 
                Wait, I see 'priority' in ProjectFormCard usage in ProjectRenderer, but let's check ProjectInfo type in this file.
                Line 30: ProjectInfo. It does NOT have priority.
                I should add priority to ProjectInfo type first.
            */}
          {/* Actually, let's just add it to the type definition in the same edit if possible, or just render it if it exists (ignoring TS for a sec? No, better to be safe).
                The user request says "show the priority to the left of the project status".
                I need to make sure 'priority' is passed in 'project' prop.
                In ProjectRenderer, I see:
                priority: p.priority,
                being passed to ProjectFormCard.
                But ProjectDetailsCard receives `result.project`.
                Let's assume `result.project` has priority.
                I will update the type definition and the render.
             */}
          {(project as any).priority && (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm capitalize text-white/80">
              {(project as any).priority} Priority
            </span>
          )}
          <span className={`rounded-full px-3 py-1 text-sm capitalize ${statusClass}`}>
            {project.status || "unknown"}
          </span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-white/12 bg-white/7 p-4 text-white/85 sm:grid-cols-4">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-widest text-white/55">Deadline</div>
          <div className="text-sm text-white">{formatDate(project.deadline)}</div>
        </div>
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-widest text-white/55">Budget</div>
          <div className="text-sm text-white">{formatINR(project.budget)}</div>
        </div>
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-widest text-white/55">Actual cost</div>
          <div className="text-sm text-white">{formatINR(project.actualCost)}</div>
        </div>
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-widest text-white/55">Progress</div>
          <div className="text-sm text-white">{progress}%</div>
        </div>
      </div>

      {/* Progress bars */}
      <div className="mt-6 space-y-5">
        {/* Project progress */}
        <div>
          <div className="mb-2 text-xs text-white/60">Project progress</div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div className={`h-full rounded-full ${gradientBar}`} style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Budget utilisation */}
        <div>
          <div className="mb-2 text-xs text-white/60">Budget utilisation</div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div className={`h-full rounded-full ${gradientBar}`} style={{ width: `${budgetPct}%` }} />
          </div>
        </div>
      </div>

      {/* Two-column blocks */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Client */}
        <div className="rounded-2xl border border-white/12 bg-white/7 p-4 text-white/85">
          <div className="mb-3 text-sm font-medium text-white/90">Client</div>
          <div className="space-y-2 text-sm">
            <button
              onClick={() => onAction?.('viewClient', project.client?.id || '')}
              className="w-full"
            >
              <div className="flex items-center justify-between hover:bg-white/10 rounded-lg p-2 -m-2 transition-colors cursor-pointer group">
                <span className="text-white/60">Name</span>
                <span className="text-white group-hover:text-violet-300 flex items-center gap-1">
                  {project.client?.name || "—"}
                  {onAction && <span className="text-xs">→</span>}
                </span>
              </div>
            </button>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Company</span>
              <span className="text-white">{project.client?.company || "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Email</span>
              <span className="text-white">{project.client?.email || "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Phone</span>
              <span className="text-white">{project.client?.phone || "—"}</span>
            </div>

          </div>
        </div>

        {/* Costs snapshot */}
        <div className="rounded-2xl border border-white/12 bg-white/7 p-4 text-white/85">
          <div className="mb-3 text-sm font-medium text-white/90">Costs snapshot</div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-white/60">Budget</span>
              <span className="text-white">{formatINR(project.budget)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Actual</span>
              <span className="text-white">{formatINR(project.actualCost)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Variance</span>
              <span className="text-white">
                {formatINR((project.actualCost ?? 0) - (project.budget ?? 0))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks & Materials */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Tasks */}
        <div className="rounded-2xl border border-white/12 bg-white/7 p-4 text-white/85">
          <div className="mb-3">
            <span className="text-sm font-medium text-white/90">Tasks</span>
          </div>

          {project.tasks && project.tasks.length > 0 ? (
            <div className="max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
              <ul className="space-y-2">
                {project.tasks
                  .sort((a, b) => (a.sequenceOrder || 0) - (b.sequenceOrder || 0))
                  .map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-white">{t.name}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${t.status === "completed"
                          ? "bg-emerald-500/25 text-emerald-100"
                          : t.status === "in_progress"
                            ? "bg-amber-500/25 text-amber-100"
                            : "bg-white/15 text-white"
                          }`}
                      >
                        {t.status}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ) : (
            <div className="text-sm text-white/60">No tasks yet.</div>
          )}
        </div>

        {/* Materials */}
        <div className="rounded-2xl border border-white/12 bg-white/7 p-4 text-white/85">
          <div className="mb-3">
            <span className="text-sm font-medium text-white/90">Materials</span>
          </div>

          {project.materials && project.materials.length > 0 ? (
            <div className="max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
              <ul className="space-y-2">
                {project.materials.map((m) => (
                  <li key={m.id} className="flex items-center justify-between text-sm">
                    <span className="text-white">
                      {m.name} • {m.quantity ?? 0} {m.unit || ""}
                    </span>
                    <span className="text-white/80">{formatINR(m.totalCost)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-sm text-white/60">No materials recorded.</div>
          )}
        </div>
      </div>
      {/* Action Buttons */}
      {onAction && (
        <div className="mt-6 flex flex-wrap gap-3 pt-6 border-t border-white/10">
          <button
            onClick={() => onAction('generateInvoice', project.id)}
            className="px-4 py-2.5 rounded-xl bg-linear-to-r from-[#7c3aed] via-[#a855f7] to-[#ec4899] hover:shadow-[0_12px_40px_rgba(124,58,237,0.45)] transition-all text-sm font-medium text-white"
          >
            Generate Invoice
          </button>
          <button
            onClick={() => onAction('editProject', project.id)}
            className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 hover:bg-white/15 transition-all text-sm font-medium text-white"
          >
            Edit
          </button>
        </div>
      )}
    </div>
  );
}

