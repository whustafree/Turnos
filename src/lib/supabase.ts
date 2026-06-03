import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://kjhrxdnwuwdmktdwuhdi.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqaHJ4ZG53dXdkbWt0ZHd1aGRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5NTg0MjIsImV4cCI6MjA1ODUzNDQyMn0.5t_YhKBlFWHTf5NMGpGJ2QeEAgSV8vMvETpGj0c7tPQ'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
