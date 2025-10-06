import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const FRONT_IMAGE_URL = "/lovable-uploads/f38c8a55-bc52-4094-ba35-922d9f53e727.png"
const BACK_IMAGE_URL = "/lovable-uploads/35f277b8-2eb9-4d8b-9305-c261d0526a41.png"

serve(async (req) => {
  const { view } = await req.json()
  
  const imageUrl = view === 'front' ? FRONT_IMAGE_URL : BACK_IMAGE_URL

  return new Response(
    JSON.stringify({ imageUrl }),
    {
      headers: { 'Content-Type': 'application/json' },
    },
  )
})