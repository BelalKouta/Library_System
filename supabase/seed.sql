-- Shelfwalk library data. Safe to run more than once.
-- Run AFTER supabase/schema.sql.

-- Starter catalogue: only inserted when the table is empty.
insert into public.library_books
  (title, author, category, description, call_number, shelf, shelf_row, shelf_slot, cover_color, accent_color)
select v.* from (values
  ('The Architecture of Happiness', 'Alain de Botton', 'Architecture', 'A thoughtful guide to the spaces that shape how we feel.', 'NA 2500 D4', 'A', 0, 0, '#244868', '#D5BD8B'),
  ('The Design of Everyday Things', 'Don Norman', 'Design', 'A classic exploration of human-centred design and useful things.', 'TS 171.4 N67', 'A', 0, 1, '#C46445', '#F0C98C'),
  ('Ways of Seeing', 'John Berger', 'Art & Media', 'Essays on images, culture, and the act of looking.', 'N 70 B45', 'A', 0, 2, '#304D3E', '#E0C993'),
  ('A Brief History of Time', 'Stephen Hawking', 'Physics', 'An accessible journey through the universe and its great questions.', 'QC 16 H33', 'A', 0, 3, '#263B61', '#DCCB9F'),
  ('The Hidden Life of Trees', 'Peter Wohlleben', 'Biology', 'What forest ecologies reveal about cooperation and communication.', 'QK 475 W64', 'A', 0, 4, '#54715A', '#E1D1A9'),
  ('The City & the City', 'China Miéville', 'Fiction', 'A literary mystery set in two cities occupying the same space.', 'PR 6063 I37', 'B', 1, 0, '#762F36', '#D4B99A'),
  ('Kindred', 'Octavia E. Butler', 'Fiction', 'A powerful novel about history, kinship, and survival.', 'PS 3552 U827', 'B', 1, 1, '#334F76', '#DDAA7B'),
  ('Invisible Cities', 'Italo Calvino', 'Fiction', 'Marco Polo describes impossible cities in a series of luminous miniatures.', 'PQ 4809 A45', 'B', 1, 2, '#C07743', '#F1D7A0'),
  ('The Left Hand of Darkness', 'Ursula K. Le Guin', 'Fiction', 'A journey across a winter planet and an imagined culture.', 'PS 3562 E42', 'B', 1, 3, '#3A5465', '#C5BA9B'),
  ('On Photography', 'Susan Sontag', 'Art & Media', 'A foundational collection of essays on photography and its meanings.', 'TR 183 S66', 'C', 2, 0, '#72533E', '#E3D2AB'),
  ('The Visual Display of Quantitative Information', 'Edward Tufte', 'Data & Society', 'A study of clarity, evidence, and excellence in information graphics.', 'QA 276.3 T83', 'C', 2, 1, '#556B73', '#E0CFA5'),
  ('Braiding Sweetgrass', 'Robin Wall Kimmerer', 'Biology', 'Botany, indigenous knowledge, and reciprocity with the natural world.', 'QK 75 K56', 'C', 2, 2, '#5A7359', '#E5D2A7'),
  ('The Dispossessed', 'Ursula K. Le Guin', 'Fiction', 'A physicist crosses worlds in search of a more just society.', 'PS 3562 E42 D5', 'D', 3, 0, '#5D465F', '#CFB68E'),
  ('Ways of Being', 'James Bridle', 'Technology', 'A wider account of intelligence across life, machines, and place.', 'QH 325 B75', 'D', 3, 1, '#397269', '#E4C887'),
  ('A Field Guide to Getting Lost', 'Rebecca Solnit', 'Essays', 'Essays on uncertainty, place, memory, and discovery.', 'E 169.12 S65', 'D', 3, 2, '#BA654E', '#E9D1A5'),
  ('The Mushroom at the End of the World', 'Anna Lowenhaupt Tsing', 'Anthropology', 'An ethnography of life and collaboration in disturbed landscapes.', 'GN 476.73 T75', 'E', 4, 0, '#8B6044', '#E5C997'),
  ('The Poetics of Space', 'Gaston Bachelard', 'Architecture', 'A philosophical study of how intimate spaces shape imagination.', 'BH 301 S65 B3', 'E', 4, 1, '#39546B', '#D5BE91'),
  ('Ways of Curating', 'Hans Ulrich Obrist', 'Art & Media', 'Conversations about collecting, exhibitions, and cultural memory.', 'N 4390 O27', 'F', 5, 0, '#9F4D42', '#E8D3AF')
) as v(title, author, category, description, call_number, shelf, shelf_row, shelf_slot, cover_color, accent_color)
where not exists (select 1 from public.library_books);

-- Fixed librarian account. Replace its password hash with your institution's managed value before deployment.
insert into public.users (username, name, login_method, email, password_hash, role) values
  ('admin',  'Library Librarian', 'staff', 'admin@library.local', 'shelfwalk-fixed-admin-v1:0dc1476d50a6be521e4313662fd782dd403eecc1ea1134880ad57df8221391052f327d1e38e186febce212a4b1aa3a0747f53d90d85ab0778e211545434a9003', 'admin')
on conflict (username) do nothing;
