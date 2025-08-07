import { createClient } from '@supabase/supabase-js'

// Configuração temporária para desenvolvimento
// Em produção, essas variáveis viriam do .env
const supabaseUrl = 'https://your-project.supabase.co'
const supabaseKey = 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Tipos para o banco de dados
export interface PhotoSession {
  id: string
  step: number
  current_photo_index: number
  photos: any[]
  chosen_photos: string[]
  grid_positions: any[]
  descriptions: Record<string, string>
  created_at: string
  updated_at: string
}