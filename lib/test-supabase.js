import { supabase } from '@/lib/supabase'

export async function testSupabase() {
  console.log('🔵 Testing Supabase connection...')
  
  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .limit(1)

    if (error) {
      console.error('❌ Supabase error:', error)
      return { success: false, error: error.message }
    }

    console.log('🟢 Supabase connected successfully')
    console.log('Sample data:', data)
    return { success: true, data }
    
  } catch (error) {
    console.error('❌ Supabase connection failed:', error)
    return { success: false, error: error.message }
  }
}