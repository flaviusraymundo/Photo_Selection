import { useState, useEffect, useCallback } from 'react'
import { supabase, PhotoSession } from '../lib/supabase'

export function useRealtimeSync(sessionId: string) {
  const [isOperator, setIsOperator] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [sessionData, setSessionData] = useState<PhotoSession | null>(null)

  // Sincronizar estado local com Supabase
  const syncToSupabase = useCallback(async (data: Partial<PhotoSession>) => {
    if (!isOperator) return

    try {
      const { error } = await supabase
        .from('photo_sessions')
        .upsert({
          id: sessionId,
          ...data,
          updated_at: new Date().toISOString()
        })

      if (error) throw error
    } catch (error) {
      console.error('Erro ao sincronizar:', error)
    }
  }, [sessionId, isOperator])

  // Carregar sessão existente ou criar nova
  const initializeSession = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('photo_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        // Sessão existe - modo observador
        setSessionData(data)
        setIsOperator(false)
      } else {
        // Primeira vez - modo operador
        const newSession: PhotoSession = {
          id: sessionId,
          step: 0,
          current_photo_index: 0,
          photos: [],
          chosen_photos: [],
          grid_positions: Array(12).fill(null),
          descriptions: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const { error: insertError } = await supabase
          .from('photo_sessions')
          .insert(newSession)

        if (insertError) throw insertError

        setSessionData(newSession)
        setIsOperator(true)
      }

      setIsConnected(true)
    } catch (error) {
      console.error('Erro ao inicializar sessão:', error)
      // Fallback para modo local
      setIsConnected(false)
      setIsOperator(true)
    }
  }, [sessionId])

  // Configurar listener em tempo real
  useEffect(() => {
    if (!isConnected) return

    const channel = supabase
      .channel(`session_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'photo_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          if (!isOperator) {
            setSessionData(payload.new as PhotoSession)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, isConnected, isOperator])

  // Inicializar na montagem
  useEffect(() => {
    initializeSession()
  }, [initializeSession])

  return {
    isOperator,
    isConnected,
    sessionData,
    syncToSupabase
  }
}