'use client'

import React from 'react'
import { Calendar, CheckCircle2, Clock, DollarSign, Package, User } from 'lucide-react'

// Project Card
export function ProjectCard({
  title,
  clientName,
  status,
  deadline,
  progress,
  onView,
}: {
  title: string
  clientName?: string
  status: string
  deadline?: string
  progress?: number
  onView?: () => void
}) {
  const statusColors = {
    active: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    on_hold: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  }

  return (
    <div 
      className="border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer bg-card"
      onClick={onView}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{title}</h3>
          {clientName && (
            <div className="flex items-center text-sm text-muted-foreground mt-1">
              <User className="h-3 w-3 mr-1" />
              {clientName}
            </div>
          )}
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${statusColors[status as keyof typeof statusColors]}`}>
          {status.replace('_', ' ')}
        </span>
      </div>

      {deadline && (
        <div className="flex items-center text-sm text-muted-foreground mb-2">
          <Calendar className="h-3 w-3 mr-1" />
          Due: {new Date(deadline).toLocaleDateString()}
        </div>
      )}

      {typeof progress === 'number' && (
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span>Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Invoice Card
export function InvoiceCard({
  invoiceNumber,
  clientName,
  total,
  paid,
  status,
  dueDate,
  onView,
}: {
  invoiceNumber: string
  clientName?: string
  total: number
  paid: number
  status: string
  dueDate?: string
  onView?: () => void
}) {
  const balance = total - paid
  const statusColors = {
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30',
    sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30',
    paid: 'bg-green-100 text-green-800 dark:bg-green-900/30',
    overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30',
  }

  return (
    <div 
      className="border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer bg-card"
      onClick={onView}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold">{invoiceNumber}</h3>
          {clientName && (
            <p className="text-sm text-muted-foreground">{clientName}</p>
          )}
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${statusColors[status as keyof typeof statusColors]}`}>
          {status}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total:</span>
          <span className="font-semibold">₹{total.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Paid:</span>
          <span className="text-green-600 dark:text-green-400">₹{paid.toLocaleString()}</span>
        </div>
        {balance > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Balance:</span>
            <span className="font-semibold text-red-600 dark:text-red-400">₹{balance.toLocaleString()}</span>
          </div>
        )}
      </div>

      {dueDate && (
        <div className="flex items-center text-xs text-muted-foreground mt-3 pt-3 border-t">
          <Clock className="h-3 w-3 mr-1" />
          Due: {new Date(dueDate).toLocaleDateString()}
        </div>
      )}
    </div>
  )
}

// Task Card
export function TaskCard({
  title,
  projectTitle,
  status,
  estimatedMinutes,
  urgency,
}: {
  title: string
  projectTitle?: string
  status: string
  estimatedMinutes?: number
  urgency?: 'low' | 'medium' | 'high'
}) {
  const urgencyColors = {
    low: 'bg-gray-100 dark:bg-gray-800',
    medium: 'bg-yellow-100 dark:bg-yellow-900/30',
    high: 'bg-red-100 dark:bg-red-900/30',
  }

  return (
    <div className={`border rounded-lg p-3 ${urgency ? urgencyColors[urgency] : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium">{title}</h4>
          {projectTitle && (
            <p className="text-xs text-muted-foreground mt-1">{projectTitle}</p>
          )}
        </div>
        {status === 'completed' && (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        )}
      </div>
      {estimatedMinutes && (
        <div className="flex items-center text-xs text-muted-foreground mt-2">
          <Clock className="h-3 w-3 mr-1" />
          ~{Math.round(estimatedMinutes / 60)}h {estimatedMinutes % 60}m
        </div>
      )}
    </div>
  )
}

// Material Low Stock Alert
export function LowStockAlert({
  materials,
}: {
  materials: Array<{ name: string; quantity: number; unit: string }>
}) {
  return (
    <div className="border border-orange-300 dark:border-orange-700 rounded-lg p-4 bg-orange-50 dark:bg-orange-950/30">
      <div className="flex items-start">
        <Package className="h-5 w-5 text-orange-600 dark:text-orange-400 mr-2 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-orange-900 dark:text-orange-100">Low Stock Alert</h4>
          <ul className="mt-2 space-y-1 text-sm">
            {materials.map((m, i) => (
              <li key={i} className="text-orange-800 dark:text-orange-200">
                {m.name}: {m.quantity} {m.unit} remaining
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

// Daily Plan Summary
export function DailyPlanSummary({
  date,
  tasksPlanned,
  hoursPlanned,
  urgentProjects,
}: {
  date: string
  tasksPlanned: number
  hoursPlanned: string
  urgentProjects: number
}) {
  return (
    <div className="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30">
      <h3 className="font-semibold text-lg mb-3">📅 Daily Plan</h3>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{tasksPlanned}</div>
          <div className="text-xs text-muted-foreground">Tasks</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{hoursPlanned}h</div>
          <div className="text-xs text-muted-foreground">Planned</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{urgentProjects}</div>
          <div className="text-xs text-muted-foreground">Urgent</div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-3 text-center">
        {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>
    </div>
  )
}
