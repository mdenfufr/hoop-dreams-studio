-- Allow players to update their own ailments
CREATE POLICY "Players can update their own ailments" 
ON public.ailments 
FOR UPDATE 
USING (player_id IN ( SELECT players.id
   FROM players
  WHERE (players.user_id = auth.uid())));