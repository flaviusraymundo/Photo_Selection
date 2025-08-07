import React, { useState } from 'react'
import { Users, Eye, Settings } from 'lucide-react'

interface SessionManagerProps {
  sessionId: string
  isOperator: boolean
  isConnected: boolean
  onCreateSession: () => void
  onJoinSession: (id: string) => void
}

export function SessionManager({ 
  sessionId, 
  isOperator, 
  isConnected, 
  onCreateSession, 
  onJoinSession 
}: SessionManagerProps) {
  const [joinId, setJoinId] = useState('')
  const [showJoin, setShowJoin] = useState(false)

  if (isConnected) {
    return (
      <div className="fixed top-4 right-4 bg-white rounded-lg shadow-lg p-4 border z-50">
        <div className="flex items-center gap-2 text-sm">
          {isOperator ? (
            <>
              <Settings className="w-4 h-4 text-blue-500" />
              <span className="font-medium">Operador</span>
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 text-green-500" />
              <span className="font-medium">Observador</span>
            </>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Sessão: {sessionId.slice(0, 8)}...
        </div>
        {isOperator && (
          <div className="text-xs text-blue-600 mt-2">
            Compartilhe este link para observação:
            <div className="bg-gray-100 p-1 rounded mt-1 font-mono text-xs break-all">
              {window.location.origin}?session={sessionId}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <Users className="w-12 h-12 text-blue-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold">Sessão Colaborativa</h2>
          <p className="text-gray-600 text-sm">
            Trabalhe em equipe na seleção de fotos
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={onCreateSession}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Criar Nova Sessão
          </button>

          <div className="text-center text-gray-500 text-sm">ou</div>

          {!showJoin ? (
            <button
              onClick={() => setShowJoin(true)}
              className="w-full border border-gray-300 py-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Assistir Sessão Existente
            </button>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="ID da sessão ou URL completa"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowJoin(false)}
                  className="flex-1 border border-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const id = joinId.includes('session=') 
                      ? joinId.split('session=')[1] 
                      : joinId
                    onJoinSession(id)
                  }}
                  disabled={!joinId.trim()}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  Entrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}