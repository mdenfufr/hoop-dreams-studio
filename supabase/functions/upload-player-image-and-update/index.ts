import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const playerId = formData.get('player_id') as string | null
    const oldUrl = formData.get('old_url') as string | null
    const preferredPath = formData.get('preferred_path') as string | null

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }
    if (!playerId) {
      return new Response(JSON.stringify({ error: 'player_id is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // Service role para Storage remove y UPDATE en DB
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Determinar nombre de objeto
    const objectPath = preferredPath && preferredPath.trim().length > 0
      ? preferredPath
      : `players/${playerId}-${crypto.randomUUID()}-${file.name}`

    // Subir con upsert si preferredPath (sobrescribir)
    const { error: uploadError } = await supabase.storage
      .from('player-images')
      .upload(objectPath, file, { upsert: Boolean(preferredPath) })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return new Response(JSON.stringify({ error: 'Error uploading file' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }

    // Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('player-images')
      .getPublicUrl(objectPath)

    const cleanUrl = publicUrl.split('?')[0]

    // Eliminar imagen anterior si es distinta
    if (oldUrl) {
      try {
        const idx = oldUrl.indexOf('/player-images/')
        if (idx !== -1) {
          const pathWithQuery = oldUrl.substring(idx + '/player-images/'.length)
          const oldPath = pathWithQuery.split('?')[0]
          if (oldPath && oldPath !== objectPath) {
            await supabase.storage.from('player-images').remove([oldPath])
          }
        }
      } catch (cleanupErr) {
        console.error('Cleanup old image error:', cleanupErr)
      }
    }

    // Actualizar DB: players.image_url
    const { error: updateError } = await supabase
      .from('players')
      .update({ image_url: cleanUrl })
      .eq('id', playerId)

    if (updateError) {
      console.error('DB update error:', updateError)
      return new Response(JSON.stringify({ error: 'Error updating player image_url' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }

    return new Response(JSON.stringify({ url: cleanUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Server error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})