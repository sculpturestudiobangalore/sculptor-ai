import React from 'react'
import ClientListCard from '@/components/cards/ClientListCard'
import ClientDetailsCard from '@/components/cards/ClientDetailsCard'
import GenericSuccessCard from '@/components/cards/GenericSuccessCard'
import FallbackCard from '@/components/cards/FallbackCard'
import { ListClientsOutput, GenericSuccessOutput } from '@/types/tool-types'

interface ClientRendererProps {
    toolName: string
    result: any
    onAction?: (action: string, data: any) => void
}

export function ClientRenderer({ toolName, result, onAction }: ClientRendererProps) {
    if (toolName === 'listClientsTool') {
        return (
            <div className="flex flex-col gap-4">
                <ClientListCard output={result as ListClientsOutput} onAction={onAction} />
            </div>
        )
    }

    if (toolName === 'getClientTool') {
        return <ClientDetailsCard output={result} onAction={onAction} />
    }

    // Handle generic success cases for client tools
    if ([
        'createClientTool',
        'updateClientTool',
        'generateClientUpdateTool',
        'updateClientStateTool',
        'validateClientDataTool'
    ].includes(toolName)) {
        return <GenericSuccessCard output={result as GenericSuccessOutput} toolName={toolName} />
    }

    return <FallbackCard toolName={toolName} output={result} />
}
