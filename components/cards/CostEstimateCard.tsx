import React from "react";

type CostBreakdown = {
    laborHours: number;
    laborRate: number;
    laborCost: number;
    materialCost: number;
    subtotal: number;
    overheadPercentage: number;
    overhead: number;
    totalEstimate: number;
};

type EstimateProjectCostOutput = {
    success: boolean;
    projectId?: string;
    projectName?: string;
    breakdown?: CostBreakdown;
    message?: string;
    error?: string;
};

// Match your existing cards (same base as ToolCard)
const baseCardStyle =
    "rounded-[28px] border border-white/12 bg-white/10 p-6 text-white/90 backdrop-blur-[70px] shadow-[0_45px_140px_rgba(17,0,58,0.55)]";

// Reuse pipeline gradient
const gradientBar = "bg-gradient-to-r from-[#7c3aed] via-[#a855f7] to-[#ec4899]";

function formatINR(n?: number | null) {
    if (typeof n !== "number") return "—";
    return n.toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
}

export default function CostEstimateCard({ output }: { output?: EstimateProjectCostOutput }) {
    if (!output?.success || !output.breakdown) {
        return (
            <div className="rounded-[28px] border border-rose-400/30 bg-rose-500/10 p-6 text-rose-100 backdrop-blur-[70px] shadow-[0_45px_140px_rgba(17,0,58,0.35)]">
                <div className="text-xs uppercase tracking-[0.35em] text-rose-200/80">Cost estimation</div>
                <h3 className="mt-1 text-xl font-semibold">Estimation failed</h3>
                <p className="mt-3 text-sm">{output?.error ?? "Please provide required inputs and try again."}</p>
            </div>
        );
    }

    const b = output.breakdown;

    // Composition for stacked bar
    const total = Math.max(b.totalEstimate || 0, 0);
    const laborPct = total > 0 ? Math.round((b.laborCost / total) * 100) : 0;
    const materialPct = total > 0 ? Math.round((b.materialCost / total) * 100) : 0;
    const overheadPct = total > 0 ? Math.max(0, 100 - laborPct - materialPct) : 0;

    return (
        <div className={baseCardStyle}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-xs uppercase tracking-[0.35em] text-white/45">Cost estimation</div>
                    <h3 className="text-xl font-semibold text-white sm:text-2xl">
                        {output.projectName || "Project"}
                    </h3>
                </div>
                <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm text-white/80">
                    {output.message || "Estimate ready"}
                </div>
            </div>

            {/* KPI Grid */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/12 bg-white/7 p-4 text-white/85">
                    <div className="text-xs uppercase tracking-widest text-white/55">Labor</div>
                    <div className="mt-2 text-2xl font-semibold">{formatINR(b.laborCost)}</div>
                    <div className="mt-1 text-sm text-white/70">
                        {b.laborHours} hrs × {formatINR(b.laborRate)}
                    </div>
                </div>

                <div className="rounded-2xl border border-white/12 bg-white/7 p-4 text-white/85">
                    <div className="text-xs uppercase tracking-widest text-white/55">Materials</div>
                    <div className="mt-2 text-2xl font-semibold">{formatINR(b.materialCost)}</div>
                    <div className="mt-1 text-sm text-white/70">Direct material costs</div>
                </div>

                <div className="rounded-2xl border border-white/12 bg-white/7 p-4 text-white/85">
                    <div className="text-xs uppercase tracking-widest text-white/55">Overhead</div>
                    <div className="mt-2 text-2xl font-semibold">{formatINR(b.overhead)}</div>
                    <div className="mt-1 text-sm text-white/70">{b.overheadPercentage}% on subtotal</div>
                </div>

                <div className="rounded-2xl border border-white/12 bg-white/7 p-4 text-white/85">
                    <div className="text-xs uppercase tracking-widest text-white/55">Total estimate</div>
                    <div className="mt-2 text-3xl font-semibold">{formatINR(b.totalEstimate)}</div>
                    <div className="mt-1 text-sm text-white/70">Subtotal {formatINR(b.subtotal)}</div>
                </div>
            </div>

            {/* Composition Bar */}
            <div className="mt-6">
                <div className="mb-2 flex items-center justify-between text-xs text-white/60">
                    <span>Cost composition</span>
                    <span className="space-x-3">
                        <span className="inline-flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-emerald-400" /> Labor {laborPct}%
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-sky-400" /> Materials {materialPct}%
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-fuchsia-400" /> Overhead {overheadPct}%
                        </span>
                    </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="float-left h-full bg-emerald-400" style={{ width: `${laborPct}%` }} />
                    <div className="float-left h-full bg-sky-400" style={{ width: `${materialPct}%` }} />
                    <div className="float-left h-full bg-fuchsia-400" style={{ width: `${overheadPct}%` }} />
                </div>
            </div>

            {/* Accent divider using your gradient */}
            <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div className={`h-full ${gradientBar}`} style={{ width: "100%" }} />
            </div>
        </div>
    );
}
