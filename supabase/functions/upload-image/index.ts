import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const oldUrl = formData.get('old_url') as string | null
    const preferredPath = formData.get('preferred_path') as string | null

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // necesario para remove()
    )

    const fileName = preferredPath && preferredPath.trim()
      ? preferredPath
      : `${crypto.randomUUID()}-${file.name}`

    const { error: uploadError } = await supabase.storage
      .from('player-images')
      .upload(fileName, file, { upsert: Boolean(preferredPath) })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return new Response(JSON.stringify({ error: 'Error uploading file' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
      })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('player-images')
      .getPublicUrl(fileName)

    // Borrar antiguo si es diferente
    if (oldUrl) {
      try {
        const idx = oldUrl.indexOf('/player-images/')
        if (idx !== -1) {
          const pathWithQuery = oldUrl.substring(idx + '/player-images/'.length)
          const oldPath = pathWithQuery.split('?')[0]
          if (oldPath && oldPath !== fileName) {
            await supabase.storage.from('player-images').remove([oldPath])
          }
        }
      } catch (e) {
        console.error('Cleanup old image error:', e)
      }
    }

    return new Response(JSON.stringify({ url: publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
    })
  } catch (error) {
    console.error('Server error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
    })
  }
})