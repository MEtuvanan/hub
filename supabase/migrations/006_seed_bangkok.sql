-- 006_seed_bangkok: verified Bangkok districts, places, quests, and characters.

do $$
declare
  bkk_id int;
  cat_temple int;
  cat_museum int;
  cat_park int;
  cat_market int;
  cat_landmark int;
  dist_phra_nakhon int;
  dist_dusit int;
  dist_chatuchak int;
  dist_bang_rak int;
  dist_samphanthawong int;
  
  char_tuktuk uuid;
  char_yak uuid;
  char_kinnaree uuid;
  char_lotus uuid;

  p_wat_phra_kaew uuid;
  p_wat_arun uuid;
  p_wat_pho uuid;
  p_chatuchak uuid;
  p_yaowarat uuid;
  p_lumphini uuid;
  p_jim_thompson uuid;
  p_national_museum uuid;

  q1 uuid; q2 uuid; q3 uuid; q4 uuid; q5 uuid;
  qn1 uuid; qn2 uuid; qn3 uuid; qn4 uuid; qn5 uuid;
  op1 uuid; op2 uuid; op3 uuid; op4 uuid;
begin
  select id into bkk_id from public.provinces where name_en = 'Bangkok';
  if bkk_id is null then
    insert into public.provinces (name_en, name_th) values ('Bangkok', 'กรุงเทพมหานคร') returning id into bkk_id;
  end if;

  select id into cat_temple from public.place_categories where slug = 'temple';
  select id into cat_museum from public.place_categories where slug = 'museum';
  select id into cat_park from public.place_categories where slug = 'park';
  select id into cat_market from public.place_categories where slug = 'market';
  select id into cat_landmark from public.place_categories where slug = 'landmark';

  -- Bangkok Districts
  insert into public.districts (province_id, name_en, name_th) values
    (bkk_id, 'Phra Nakhon', 'พระนคร'),
    (bkk_id, 'Dusit', 'ดุสิต'),
    (bkk_id, 'Chatuchak', 'จตุจักร'),
    (bkk_id, 'Bang Rak', 'บางรัก'),
    (bkk_id, 'Samphanthawong', 'สัมพันธวงศ์')
  on conflict (province_id, name_en) do nothing;

  select id into dist_phra_nakhon from public.districts where province_id = bkk_id and name_en = 'Phra Nakhon';
  select id into dist_chatuchak from public.districts where province_id = bkk_id and name_en = 'Chatuchak';
  select id into dist_bang_rak from public.districts where province_id = bkk_id and name_en = 'Bang Rak';
  select id into dist_samphanthawong from public.districts where province_id = bkk_id and name_en = 'Samphanthawong';

  -- Collectible Characters
  insert into public.characters (name, description, rarity, unlock_hint) values
    ('Tuk-Tuk Speedy', 'The energetic spirit of Bangkok streets, loves zooming through alleys and river crossings.', 'common', 'Complete any quest in Phra Nakhon.')
  returning id into char_tuktuk;

  insert into public.characters (name, description, rarity, unlock_hint) values
    ('Guardian Yak', 'A noble temple guardian watching over the Emerald Buddha with an unyielding smile.', 'rare', 'Complete the Grand Palace quiz with a perfect score.')
  returning id into char_yak;

  insert into public.characters (name, description, rarity, unlock_hint) values
    ('Kinnaree Dreamer', 'Mythical celestial dancer who preserves ancient Thai tales and musical melodies.', 'epic', 'Complete quests at 3 different Bangkok temples.')
  returning id into char_kinnaree;

  insert into public.characters (name, description, rarity, unlock_hint) values
    ('Lotus Blossom', 'Calm and tranquil spirit found floating on the serene waters of Lumphini Lake.', 'common', 'Check in at Lumphini Park.')
  returning id into char_lotus;

  -- 1. Wat Phra Kaew & Grand Palace
  insert into public.places (name, summary, description, province_id, district_id, category_id, lat, lng, visitor_info, status, verified)
  values (
    'Wat Phra Kaew (Temple of the Emerald Buddha)',
    'Thailand''s most sacred Buddhist temple housing the Emerald Buddha within the historic Grand Palace complex.',
    'Regarded as the most sacred Buddhist temple in Thailand. The complex consists of intricately decorated buildings with golden spires, vibrant murals depicting the Ramakien epic, and the venerated Emerald Buddha carved from a single block of jade.',
    bkk_id, dist_phra_nakhon, cat_temple, 13.7516, 100.4927,
    'Open daily 08:30 - 15:30. Strict dress code required: shoulders and knees must be covered.',
    'published', true
  ) returning id into p_wat_phra_kaew;

  -- 2. Wat Pho (Temple of the Reclining Buddha)
  insert into public.places (name, summary, description, province_id, district_id, category_id, lat, lng, visitor_info, status, verified)
  values (
    'Wat Pho (Temple of the Reclining Buddha)',
    'Home of the magnificent 46-meter Reclining Buddha and the birthplace of traditional Thai massage.',
    'One of Bangkok''s oldest and largest temples, Wat Pho houses a giant reclining Buddha covered in gold leaf with mother-of-pearl soles detailing the 108 auspicious characteristics of the Buddha. It is also the national headquarters for the preservation and teaching of traditional Thai massage.',
    bkk_id, dist_phra_nakhon, cat_temple, 13.7465, 100.4933,
    'Open daily 08:00 - 18:30. Modest attire requested.',
    'published', true
  ) returning id into p_wat_pho;

  -- 3. Wat Arun (Temple of Dawn)
  insert into public.places (name, summary, description, province_id, district_id, category_id, lat, lng, visitor_info, status, verified)
  values (
    'Wat Arun (Temple of Dawn)',
    'Majestic riverside landmark renowned for its soaring porcelain-encrusted central prang on the Chao Phraya River.',
    'Standing tall on the Thonburi bank of the Chao Phraya River, Wat Arun is famous for its towering central prang adorned with thousands of pieces of colorful Chinese porcelain and seashell mosaics.',
    bkk_id, dist_phra_nakhon, cat_temple, 13.7437, 100.4889,
    'Open daily 08:00 - 18:00. Accessible by river ferry from Tha Tien pier.',
    'published', true
  ) returning id into p_wat_arun;

  -- 4. Chatuchak Weekend Market
  insert into public.places (name, summary, description, province_id, district_id, category_id, lat, lng, visitor_info, status, verified)
  values (
    'Chatuchak Weekend Market',
    'One of the world''s largest weekend markets featuring over 15,000 stalls selling crafts, clothing, food, and antiques.',
    'A sprawling labyrinth of shopping adventure spanning 35 acres. Divided into 27 sections offering everything from vintage fashion and handmade Thai ceramics to tropical street food and decorative arts.',
    bkk_id, dist_chatuchak, cat_market, 13.7999, 100.5501,
    'Saturdays & Sundays 09:00 - 18:00. Accessible via BTS Mo Chit or MRT Chatuchak Park.',
    'published', true
  ) returning id into p_chatuchak;

  -- 5. Yaowarat Chinatown
  insert into public.places (name, summary, description, province_id, district_id, category_id, lat, lng, visitor_info, status, verified)
  values (
    'Yaowarat (Bangkok Chinatown)',
    'A buzzing culinary hub of neon lights, gold shops, herbal dispensaries, and world-famous street food stalls.',
    'Yaowarat Road is the historic heart of Bangkok''s Chinese community. By day it is a bustling market of gold shops, spices, and tea merchants; by night it transforms into an open-air food paradise attracting foodies from around the world.',
    bkk_id, dist_samphanthawong, cat_landmark, 13.7412, 100.5083,
    'Street food stalls come alive after 18:00 (Tuesday - Sunday). Nearest MRT is Wat Mangkon.',
    'published', true
  ) returning id into p_yaowarat;

  -- 6. Lumphini Park
  insert into public.places (name, summary, description, province_id, district_id, category_id, lat, lng, visitor_info, status, verified)
  values (
    'Lumphini Park',
    'Bangkok''s first public park offering lush green lawns, swan paddleboats, shady walking trails, and resident monitor lizards.',
    'An oasis of tranquility surrounded by soaring skyscrapers. Created in the 1920s by King Rama VI, Lumphini Park is loved by joggers, picnickers, and visitors seeking a refreshing natural retreat in the city center.',
    bkk_id, dist_bang_rak, cat_park, 13.7314, 100.5414,
    'Open daily 04:30 - 22:00. Accessible via MRT Silom / Lumphini or BTS Sala Daeng.',
    'published', true
  ) returning id into p_lumphini;

  -- 7. Jim Thompson House Museum
  insert into public.places (name, summary, description, province_id, district_id, category_id, lat, lng, visitor_info, status, verified)
  values (
    'Jim Thompson House Museum',
    'A serene compound of six traditional teakwood Thai houses set within a lush tropical garden by the Saen Saep canal.',
    'The former residence of American entrepreneur Jim Thompson, who helped revitalize the Thai silk industry in the 1950s and 60s. The museum displays his exquisite collection of Southeast Asian art, Buddhist statues, and antique ceramics.',
    bkk_id, dist_phra_nakhon, cat_museum, 13.7493, 100.5284,
    'Open daily 10:00 - 18:00 (last guided tour at 17:00). Accessible via BTS National Stadium.',
    'published', true
  ) returning id into p_jim_thompson;

  -- 8. Bangkok National Museum
  insert into public.places (name, summary, description, province_id, district_id, category_id, lat, lng, visitor_info, status, verified)
  values (
    'Bangkok National Museum',
    'Southeast Asia''s largest museum exhibiting royal regalia, Ayutthaya artifacts, gold treasures, and Buddha images.',
    'Housed in the former 18th-century palace of the Prince Successor, this museum provides an unforgettable journey through Thai art and history from prehistoric times through Sukhothai, Ayutthaya, and the Rattanakosin era.',
    bkk_id, dist_phra_nakhon, cat_museum, 13.7578, 100.4922,
    'Open Wednesday - Sunday 09:00 - 16:00. Closed Mondays & Tuesdays.',
    'published', true
  ) returning id into p_national_museum;

  -- Quests:
  -- Quest 1: Secrets of the Emerald Buddha (Quiz at Wat Phra Kaew)
  insert into public.quests (title, description, type, difficulty, status, reward_tokens, reward_character_id)
  values (
    'Secrets of the Emerald Buddha',
    'Discover ancient royal history and test your knowledge of Thailand''s most sacred Buddhist sanctum.',
    'quiz', 'easy', 'published', 100, char_yak
  ) returning id into q1;
  insert into public.quest_places (quest_id, place_id) values (q1, p_wat_phra_kaew);

  insert into public.quest_questions (quest_id, position, prompt)
  values (q1, 1, 'From what precious mineral stone is the sacred Emerald Buddha carved?')
  returning id into qn1;
  insert into public.quest_options (question_id, label, position) values (qn1, 'Emerald beryl crystal', 1) returning id into op1;
  insert into public.quest_options (question_id, label, position) values (qn1, 'A single piece of green jadeite jade', 2) returning id into op2;
  insert into public.quest_options (question_id, label, position) values (qn1, 'Green blown glass', 3) returning id into op3;
  insert into public.quest_options (question_id, label, position) values (qn1, 'Solid gold with green enamel', 4) returning id into op4;
  insert into public.quest_answer_keys (option_id) values (op2);

  insert into public.quest_questions (quest_id, position, prompt)
  values (q1, 2, 'How many times per year are the seasonal robes of the Emerald Buddha officially changed by the King?')
  returning id into qn2;
  insert into public.quest_options (question_id, label, position) values (qn2, 'Once per year at Songkran', 1) returning id into op1;
  insert into public.quest_options (question_id, label, position) values (qn2, 'Twice (Dry and Wet season)', 2) returning id into op2;
  insert into public.quest_options (question_id, label, position) values (qn2, 'Three times (Summer, Rainy, and Cool seasons)', 3) returning id into op3;
  insert into public.quest_options (question_id, label, position) values (qn2, 'Every month during full moon', 4) returning id into op4;
  insert into public.quest_answer_keys (option_id) values (op3);

  -- Quest 2: Footsteps of the Giant Reclining Buddha (Quiz at Wat Pho)
  insert into public.quests (title, description, type, difficulty, status, reward_tokens, reward_character_id)
  values (
    'Wisdom of Wat Pho',
    'Unravel the sacred symbolism behind the colossal Reclining Buddha and the ancient healing arts of massage.',
    'quiz', 'medium', 'published', 120, char_kinnaree
  ) returning id into q2;
  insert into public.quest_places (quest_id, place_id) values (q2, p_wat_pho);

  insert into public.quest_questions (quest_id, position, prompt)
  values (q2, 1, 'How many auspicious lakshana (symbols) are depicted in mother-of-pearl on the soles of the Reclining Buddha?')
  returning id into qn3;
  insert into public.quest_options (question_id, label, position) values (qn3, '72 symbols', 1) returning id into op1;
  insert into public.quest_options (question_id, label, position) values (qn3, '108 symbols', 2) returning id into op2;
  insert into public.quest_options (question_id, label, position) values (qn3, '84 symbols', 3) returning id into op3;
  insert into public.quest_answer_keys (option_id) values (op2);

  -- Quest 3: Temple of Dawn Riverside Discovery (Code Check-in)
  insert into public.quests (title, description, type, difficulty, status, reward_tokens, reward_character_id)
  values (
    'Riverside Guardian at Wat Arun',
    'Visit the magnificent stupa of Wat Arun by river ferry and verify your visit with the riverside code.',
    'code', 'easy', 'published', 80, char_tuktuk
  ) returning id into q3;
  insert into public.quest_places (quest_id, place_id) values (q3, p_wat_arun);
  insert into public.quest_secrets (quest_id, checkin_code) values (q3, 'ARUN2026');

  -- Quest 4: Chinatown Flavor Trail (Check-in Code)
  insert into public.quests (title, description, type, difficulty, status, reward_tokens, reward_character_id)
  values (
    'Yaowarat Flavor Hunter',
    'Explore the dazzling neon signs of Chinatown and enter the street check-in code.',
    'code', 'easy', 'published', 70, char_tuktuk
  ) returning id into q4;
  insert into public.quest_places (quest_id, place_id) values (q4, p_yaowarat);
  insert into public.quest_secrets (quest_id, checkin_code) values (q4, 'YAOWARAT99');

  -- Quest 5: Green Heart of Bangkok (Quiz at Lumphini Park)
  insert into public.quests (title, description, type, difficulty, status, reward_tokens, reward_character_id)
  values (
    'Lumphini Nature Patrol',
    'Test your knowledge about Bangkok''s oldest park and its fascinating wild residents.',
    'quiz', 'easy', 'published', 60, char_lotus
  ) returning id into q5;
  insert into public.quest_places (quest_id, place_id) values (q5, p_lumphini);

  insert into public.quest_questions (quest_id, position, prompt)
  values (q5, 1, 'Which iconic wild animal is famously spotted swimming and basking peacefully by the lakes of Lumphini Park?')
  returning id into qn4;
  insert into public.quest_options (question_id, label, position) values (qn4, 'Asian water monitor lizard (Varanus salvator)', 1) returning id into op1;
  insert into public.quest_options (question_id, label, position) values (qn4, 'Freshwater river crocodile', 2) returning id into op2;
  insert into public.quest_options (question_id, label, position) values (qn4, 'Indochinese tiger', 3) returning id into op3;
  insert into public.quest_answer_keys (option_id) values (op1);

end $$;
