import React from 'react';
import {
    Calendar, Clock, Users, Zap, AlertTriangle, CheckCircle2,
    User, Package, ExternalLink, TrendingUp, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
    id: string;
    name: string;
    project_name?: string;
    estimated_hours: number;
    status: string;
}

interface ScheduledTask {
    task: Task;
    startTime: string;
    endTime: string;
    assignedTo: string;
}

interface WorkerSchedule {
    fits_today: ScheduledTask[];
    overflow: Task[];
    total_hours: number;
}

interface ExternalVendorTask {
    vendor: string;
    task_name: string;
    project_name: string;
    days_assigned: number;
    expected_completion: string;
    blocking_tasks: string[];
}

interface MaterialAlert {
    material: string;
    total_quantity_needed: number;
    current_stock: number;
    tasks: { name: string; project: string; date: string }[];
    order_by_date: string;
    urgency: 'critical' | 'warning';
}

interface BlockedTasks {
    waiting_vendor: Task[];
    material_shortage: Task[];
    dependency_pending: Task[];
}

interface DailyScheduleCardProps {
    date: string;
    previous_day_pending?: Task[];
    schedule: Record<string, WorkerSchedule>;
    external_vendor_tasks?: ExternalVendorTask[];
    material_alerts?: MaterialAlert[];
    capacity_warnings?: string[];
    parallel_opportunities?: { taskA: string; taskB: string; reason: string }[];
    blocked_tasks?: BlockedTasks;
    confidence_score?: number;
    cached?: boolean;
}

const baseCardStyle = 'rounded-[28px] border border-white/12 bg-white/10 p-6 text-white/90 backdrop-blur-[70px] shadow-[0_45px_140px_rgba(17,0,58,0.55)]';

export default function DailyScheduleCard({
    date,
    previous_day_pending = [],
    schedule,
    external_vendor_tasks = [],
    material_alerts = [],
    capacity_warnings = [],
    parallel_opportunities = [],
    blocked_tasks = { waiting_vendor: [], material_shortage: [], dependency_pending: [] },
    confidence_score = 1,
    cached = false,
}: DailyScheduleCardProps) {

    const formatTime = (time: string) => {
        const [h, m] = time.split(':');
        const hour = parseInt(h);
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        return `${displayHour}:${m} ${period}`;
    };

    const getWorkerColor = (worker: string) => {
        const colors: Record<string, string> = {
            dhanush: 'text-blue-400',
            john: 'text-green-400',
            external: 'text-purple-400',
        };
        return colors[worker.toLowerCase()] || 'text-gray-400';
    };

    const workers = Object.keys(schedule);
    const totalTasksToday = workers.reduce((sum, w) => sum + schedule[w].fits_today.length, 0);
    const totalOverflow = workers.reduce((sum, w) => sum + schedule[w].overflow.length, 0);

    return (
        <div className="space-y-4 w-full">
            {/* Main Schedule Card */}
            <div className={cn(baseCardStyle, 'space-y-6')}>
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Calendar className="h-6 w-6 text-blue-400" />
                        <div>
                            <h3 className="text-xl font-semibold text-white">Daily Schedule</h3>
                            <p className="text-sm text-white/60">
                                {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                {cached && <span className="ml-2 text-xs text-yellow-400">(Cached)</span>}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-400" />
                            <span className="text-sm font-medium text-green-400">
                                {Math.round(confidence_score * 100)}% Confidence
                            </span>
                        </div>
                        <p className="text-xs text-white/50">{totalTasksToday} tasks scheduled</p>
                    </div>
                </div>

                {/* Previous Day Pending Alert */}
                {previous_day_pending.length > 0 && (
                    <div className="rounded-xl bg-yellow-500/10 p-4 border border-yellow-400/30">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h4 className="text-sm font-semibold text-yellow-200 mb-2">
                                    ⚠️ Pending from Yesterday ({previous_day_pending.length} tasks)
                                </h4>
                                <div className="space-y-1">
                                    {previous_day_pending.slice(0, 3).map((task, idx) => (
                                        <p key={idx} className="text-xs text-yellow-100">
                                            • {task.name} ({task.project_name}) - {task.estimated_hours}h
                                        </p>
                                    ))}
                                    {previous_day_pending.length > 3 && (
                                        <p className="text-xs text-yellow-100/70">
                                            + {previous_day_pending.length - 3} more tasks
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Stats Row */}
                <div className="grid grid-cols-4 gap-3">
                    <div className="rounded-2xl bg-white/5 p-3 border border-white/10">
                        <div className="flex items-center gap-2 text-blue-400">
                            <Clock className="h-4 w-4" />
                            <span className="text-xs font-medium">Today</span>
                        </div>
                        <p className="mt-1 text-xl font-bold text-white">{totalTasksToday}</p>
                    </div>
                    <div className="rounded-2xl bg-white/5 p-3 border border-white/10">
                        <div className="flex items-center gap-2 text-orange-400">
                            <TrendingUp className="h-4 w-4" />
                            <span className="text-xs font-medium">Overflow</span>
                        </div>
                        <p className="mt-1 text-xl font-bold text-white">{totalOverflow}</p>
                    </div>
                    <div className="rounded-2xl bg-white/5 p-3 border border-white/10">
                        <div className="flex items-center gap-2 text-purple-400">
                            <Zap className="h-4 w-4" />
                            <span className="text-xs font-medium">Parallel</span>
                        </div>
                        <p className="mt-1 text-xl font-bold text-white">{parallel_opportunities.length}</p>
                    </div>
                    <div className="rounded-2xl bg-white/5 p-3 border border-white/10">
                        <div className="flex items-center gap-2 text-red-400">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-xs font-medium">Blocked</span>
                        </div>
                        <p className="mt-1 text-xl font-bold text-white">
                            {blocked_tasks.waiting_vendor.length + blocked_tasks.dependency_pending.length}
                        </p>
                    </div>
                </div>

                {/* Material Alerts */}
                {material_alerts.length > 0 && (
                    <div>
                        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-400">
                            <Package className="h-4 w-4" />
                            Material Alerts
                        </h4>
                        <div className="space-y-2">
                            {material_alerts.map((alert, idx) => (
                                <div
                                    key={idx}
                                    className={cn(
                                        "rounded-xl p-3 border",
                                        alert.urgency === 'critical'
                                            ? "bg-red-500/10 border-red-400/30"
                                            : "bg-yellow-500/10 border-yellow-400/30"
                                    )}
                                >
                                    <p className="text-sm font-medium text-white">
                                        {alert.urgency === 'critical' ? '🚨' : '⚠️'} Order {alert.total_quantity_needed}kg {alert.material}
                                    </p>
                                    <p className="text-xs text-white/60 mt-1">
                                        Current: {alert.current_stock}kg • Needed for {alert.tasks.length} tasks • Order by {alert.order_by_date}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Capacity Warnings */}
                {capacity_warnings.length > 0 && (
                    <div>
                        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-orange-400">
                            <Users className="h-4 w-4" />
                            Capacity Warnings
                        </h4>
                        <div className="space-y-2">
                            {capacity_warnings.map((warning, idx) => (
                                <div key={idx} className="rounded-xl bg-orange-500/10 p-3 border border-orange-400/20">
                                    <p className="text-sm text-orange-200">{warning}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tasks by Worker */}
                {/* Tasks by Worker */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {workers.map((worker) => (
                        <div key={worker} className="min-w-0">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <User className={cn('h-5 w-5', getWorkerColor(worker))} />
                                    <h4 className={cn('text-base font-semibold capitalize', getWorkerColor(worker))}>
                                        {worker}'s Schedule
                                    </h4>
                                </div>
                                <span className="text-xs text-white/50">
                                    {schedule[worker].total_hours.toFixed(1)}h scheduled
                                </span>
                            </div>

                            {/* Fits Today */}
                            {schedule[worker].fits_today.length > 0 && (
                                <div className="space-y-3 mb-4">
                                    <p className="text-xs font-medium text-white/70 uppercase tracking-wide">✅ Fits Today</p>
                                    {schedule[worker].fits_today.map((task, idx) => (
                                        <div
                                            key={idx}
                                            className="rounded-xl bg-white/5 p-4 border border-white/8 hover:bg-white/10 transition-colors"
                                        >
                                            <div className="flex items-start justify-between gap-4 mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="rounded-lg bg-blue-500/10 px-3 py-1.5 border border-blue-400/20">
                                                        <p className="text-xs font-mono font-semibold text-blue-300">
                                                            {formatTime(task.startTime)}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-lg bg-green-500/10 px-2 py-1 border border-green-400/20">
                                                        <p className="text-xs font-medium text-green-300">
                                                            {task.task.estimated_hours}h
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-white mb-1.5 leading-tight">
                                                    {task.task.name}
                                                </p>
                                                <p className="text-xs text-white/60 leading-tight">
                                                    {task.task.project_name}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Overflow */}
                            {schedule[worker].overflow.length > 0 && (
                                <div className="space-y-3">
                                    <p className="text-xs font-medium text-orange-400 uppercase tracking-wide">
                                        ⏳ Overflow ({schedule[worker].overflow.length} tasks won't fit today)
                                    </p>
                                    {schedule[worker].overflow.slice(0, 3).map((task, idx) => (
                                        <div
                                            key={idx}
                                            className="rounded-xl bg-orange-500/5 p-3 border border-orange-400/20"
                                        >
                                            <p className="text-sm font-medium text-white/90 mb-1">
                                                {task.name}
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs text-white/60">{task.project_name}</p>
                                                <span className="text-xs text-orange-400">
                                                    {task.estimated_hours}h
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {schedule[worker].overflow.length > 3 && (
                                        <p className="text-xs text-white/50 text-center pt-2">
                                            + {schedule[worker].overflow.length - 3} more tasks
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>



                {/* Parallel Opportunities */}
                {parallel_opportunities.length > 0 && (
                    <div>
                        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-purple-400">
                            <Zap className="h-4 w-4" />
                            Parallel Work Opportunities
                        </h4>
                        <div className="space-y-2">
                            {parallel_opportunities.slice(0, 5).map((opp, idx) => (
                                <div key={idx} className="rounded-xl bg-purple-500/10 p-3 border border-purple-400/20">
                                    <p className="text-xs text-white/90">
                                        <span className="font-medium">{opp.taskA}</span> can run parallel with{' '}
                                        <span className="font-medium">{opp.taskB}</span>
                                    </p>
                                    <p className="text-xs text-white/50 mt-1">{opp.reason}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* External Vendor Tasks Sidebar */}
            {/* External Vendor Tasks Sidebar */}
            {external_vendor_tasks.length > 0 && (
                <div className={cn(baseCardStyle, 'space-y-4')}>
                    <div className="flex items-center gap-2">
                        <ExternalLink className="h-5 w-5 text-purple-400" />
                        <h3 className="text-lg font-semibold text-white">
                            External Vendor Tasks ({external_vendor_tasks.length})
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {external_vendor_tasks.slice(0, 10).map((task, idx) => (
                            <div key={idx} className="rounded-xl bg-purple-500/10 p-4 border border-purple-400/20">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-white">{task.task_name}</p>
                                        <p className="text-xs text-purple-300 mt-1">{task.project_name}</p>
                                    </div>
                                    <span className="text-xs text-purple-400 font-medium ml-2">
                                        {task.days_assigned}d
                                    </span>
                                </div>
                                {task.blocking_tasks.length > 0 && (
                                    <p className="text-xs text-red-400 mt-2">
                                        ⚠️ Blocks {task.blocking_tasks.length} task(s)
                                    </p>
                                )}
                            </div>
                        ))}
                        {external_vendor_tasks.length > 10 && (
                            <p className="text-xs text-white/50 col-span-2 text-center">
                                + {external_vendor_tasks.length - 10} more external tasks
                            </p>
                        )}
                    </div>
                </div>
            )}


            {/* Blocked Tasks */}
            {blocked_tasks && blocked_tasks.waiting_vendor.length > 0 && (
                <div className={cn(baseCardStyle, 'space-y-4')}>
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-400" />
                        <h3 className="text-lg font-semibold text-white">
                            Waiting on External Work ({blocked_tasks.waiting_vendor.length})
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {blocked_tasks.waiting_vendor.map((task, idx) => (
                            <div key={idx} className="rounded-lg bg-orange-500/10 p-3 border border-orange-400/20">
                                <p className="text-sm font-medium text-white">{task.name}</p>
                                <p className="text-xs text-white/60">{task.project_name}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
