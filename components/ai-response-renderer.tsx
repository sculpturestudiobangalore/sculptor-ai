'use client'

import React from 'react'
import { ProjectCard, InvoiceCard, TaskCard, LowStockAlert, DailyPlanSummary } from '@/components/ui-cards'

// Types for our AI response data
type AIResponseData = {
  type: 'text' | 'project-card' | 'invoice-card' | 'task-card' | 'low-stock-alert' | 'daily-plan-summary'
  content: any
}

// Parse AI response to extract structured data
export function parseAIResponse(text: string): AIResponseData[] {
  const results: AIResponseData[] = []
  
  try {
    // Look for JSON blocks in the response
    const jsonMatches = text.match(/```json\n([\s\S]*?)\n```/g)
    
    if (jsonMatches) {
      jsonMatches.forEach(match => {
        try {
          const jsonStr = match.replace(/```json\n/, '').replace(/\n```/, '')
          const data = JSON.parse(jsonStr)
          
          if (data.type && data.content) {
            results.push(data)
          }
        } catch (e) {
          console.warn('Failed to parse JSON block:', e)
        }
      })
    }
    
    // Add any remaining text as text content
    const textWithoutJson = text.replace(/```json\n[\s\S]*?\n```/g, '').trim()
    if (textWithoutJson) {
      results.unshift({
        type: 'text',
        content: textWithoutJson
      })
    }
  } catch (error) {
    console.error('Error parsing AI response:', error)
    results.push({
      type: 'text',
      content: text
    })
  }
  
  return results
}

// Main component to render AI responses with cards
export function AIResponseRenderer({ content }: { content: string }) {
  const responseData = parseAIResponse(content)
  
  return (
    <div className="space-y-4">
      {responseData.map((item, index) => {
        switch (item.type) {
          case 'text':
            return (
              <div key={index} className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                {item.content}
              </div>
            )
            
          case 'project-card':
            return (
              <div key={index} className="my-4">
                <ProjectCard {...item.content} />
              </div>
            )
            
          case 'invoice-card':
            return (
              <div key={index} className="my-4">
                <InvoiceCard {...item.content} />
              </div>
            )
            
          case 'task-card':
            return (
              <div key={index} className="my-4">
                <TaskCard {...item.content} />
              </div>
            )
            
          case 'low-stock-alert':
            return (
              <div key={index} className="my-4">
                <LowStockAlert {...item.content} />
              </div>
            )
            
          case 'daily-plan-summary':
            return (
              <div key={index} className="my-4">
                <DailyPlanSummary {...item.content} />
              </div>
            )
            
          default:
            return (
              <div key={index} className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                {typeof item.content === 'string' ? item.content : JSON.stringify(item.content)}
              </div>
            )
        }
      })}
    </div>
  )
}