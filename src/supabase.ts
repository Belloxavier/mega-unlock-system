import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://smjdwyddlsraqscizrzl.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtamR3eWRkbHNyYXFzY2l6cnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMDI0MDgsImV4cCI6MjEwMDc3ODQwOH0.i8mhYjakq1nvRKPDX0eum3Q1M8vJ9qhYyOQkjyT7Huo'

export const supabase = createClient(supabaseUrl, supabaseKey)