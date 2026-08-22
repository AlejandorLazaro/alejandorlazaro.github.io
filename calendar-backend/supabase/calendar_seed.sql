-- Seed data for the Staff Advance (Sept 2026) calendar.
-- Transcribed from the reference schedule image/sheet — spot-check against
-- the live private Google Sheet before treating this as authoritative.
-- Run after calendar_schema.sql.

-- insert into editors (email) values
--   ('sample@fakeemail.com'),
--   ('fakename@whatisthis.com'),
-- on conflict (email) do nothing;

insert into events (day, start_time, end_time, title, description, category) values
  -- Monday, Sept 14
  ('2026-09-14', '10:00', '12:00', 'Executive Team', null, 'executive'),
  ('2026-09-14', '14:00', '17:00', 'SLT Session', null, 'meeting'),

  -- Tuesday, Sept 15 — Dept & Team Meetings
  ('2026-09-15', '08:15', '08:45', 'Breakfast', null, 'meal'),
  ('2026-09-15', '08:45', '18:00', 'Various Department and Team Meetings', null, 'meeting'),
  ('2026-09-15', '18:00', '21:00', 'Welcome Dinner & Program',
    'Emcees give fun welcome. Large group mixer for an icebreaker. Worship: 2 songs. Keynote: Theme Intro - Abide in Christ (Kim to address with ELT). Possible closing worship song, small groups, prayer time.',
    'worship'),

  -- Wednesday, Sept 16
  ('2026-09-16', '08:15', '08:45', 'Breakfast', null, 'meal'),
  ('2026-09-16', '08:45', '09:30', 'Worship & Devo', null, 'worship'),
  ('2026-09-16', '09:30', '10:30', 'Welcome & Vision (Jamie)', null, 'session'),
  ('2026-09-16', '10:30', '11:00', 'Break', null, 'break'),
  ('2026-09-16', '11:00', '12:30', 'Turning towards Discipleship',
    'Interactive session wrestling with the shifts that are needed to get to deeper discipleship.', 'session'),
  ('2026-09-16', '12:30', '13:30', 'Lunch', null, 'meal'),
  ('2026-09-16', '13:30', '16:00', 'Free Time or Fun Activity',
    'Team-based activities (games, both indoor and outdoor options). First 30 minutes are "highly encouraged"; the rest is optional, followed by a "refresh" break.', 'freetime'),
  ('2026-09-16', '16:00', '17:30', 'Department Breakouts', null, 'breakout'),
  ('2026-09-16', '17:30', '18:00', 'Free', null, 'freetime'),
  ('2026-09-16', '18:00', '19:00', 'Dinner', null, 'meal'),
  ('2026-09-16', '19:00', '20:30', 'International Night',
    'Small Groups - Challenges: Indonesia, Spanish, Portuguese, Russian, MENA, India, Africa, English - General.', 'session'),
  ('2026-09-16', '20:30', '21:30', 'After Hours Fun Night', 'Dirty soda bar and movie night.', 'afterhours'),

  -- Thursday, Sept 17
  ('2026-09-17', '08:15', '08:45', 'Breakfast', null, 'meal'),
  ('2026-09-17', '08:45', '10:30', 'Spiritual Development Experience', 'Prayer Walk? Extended time with the Lord.', 'worship'),
  ('2026-09-17', '10:30', '11:00', 'Break', null, 'break'),
  ('2026-09-17', '11:00', '12:30', 'Tech Session', 'Path 3.0 & Operational Security — Yvonne and Dr. K.', 'session'),
  ('2026-09-17', '12:30', '13:30', 'Lunch', null, 'meal'),
  ('2026-09-17', '13:30', '15:00', 'Free Time', null, 'freetime'),
  ('2026-09-17', '15:00', '16:30', 'Language Branding Workshop', null, 'session'),
  ('2026-09-17', '16:30', '17:00', 'Break', null, 'break'),
  ('2026-09-17', '17:00', '18:00', 'Department Breakouts', null, 'breakout'),
  ('2026-09-17', '18:00', '19:00', 'Dinner', null, 'meal'),
  ('2026-09-17', '19:00', '20:30', 'Staff Development (Interactive Coaching)',
    'Everyone will have their full 34 Report. Homework: intro/reorient with a few videos. Break into groups of 4 for facilitated peer coaching.', 'session'),
  ('2026-09-17', '20:30', '21:30', 'After Hours Fun Night', 'Campfire, s''mores, & testimonies.', 'afterhours'),

  -- Friday, Sept 18
  ('2026-09-18', '08:15', '08:45', 'Breakfast', null, 'meal'),
  ('2026-09-18', '08:45', '09:30', 'Worship & Devo', null, 'worship'),
  ('2026-09-18', '09:30', '11:00', 'Prediction Guard', null, 'session'),
  ('2026-09-18', '11:00', '11:30', 'Break', null, 'break'),
  ('2026-09-18', '11:30', '12:30', 'Reflection and Gratitude / Next Steps', null, 'session'),
  ('2026-09-18', '12:30', '13:30', 'Lunch or Sack Lunches?', null, 'meal'),
  ('2026-09-18', '13:30', '17:00', 'Depart', null, 'depart');
