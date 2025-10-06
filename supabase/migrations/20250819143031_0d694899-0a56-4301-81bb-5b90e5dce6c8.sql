-- Insert the missing player record
INSERT INTO players (
  name,
  email,
  age,
  height,
  weight,
  position,
  image_url,
  jersey_number,
  category_id,
  user_id
) VALUES (
  'Player Name',  -- We need to get this from user info
  'alonsoe.diaz@pregrado.uoh.cl',
  NULL,  -- Age wasn't captured
  NULL,  -- Height wasn't captured
  NULL,  -- Weight wasn't captured
  NULL,  -- Position wasn't captured
  NULL,  -- Image URL wasn't captured
  NULL,  -- Jersey number wasn't captured
  '54b364ab-be79-475d-8af3-0b40150471d8',  -- sub-20 category ID
  'effc4439-8ea9-4790-b901-43740a3d511e'   -- user ID from users table
);