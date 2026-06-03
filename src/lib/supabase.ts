import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://kjhrxdnwuwdmktdwuhdi.supabase.co'
const SUPABASE_KEY = 'sb_publishable_0nvqhjvJiytEFeif99jVsg_eiqOtXh9'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
