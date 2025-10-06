-- Add RLS policy to allow players to delete their own ailments
CREATE POLICY "Players can delete their own ailments" 
ON public.ailments 
FOR DELETE 
USING (player_id IN ( SELECT players.id
   FROM players
  WHERE (players.user_id = auth.uid())));