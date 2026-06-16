-- Seed: two artist editorial articles (Mara Okonkwo, James Calder).
-- Run after migrations (featured_articles + cover_image_storage_path).
-- Does not touch other featured_articles rows — delete only re-seeds these two ids.
--
-- Prerequisites:
--   • At least one row in public.profiles (prefer an admin for created_by).

begin;

delete from public.featured_articles
where id in (
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'::uuid,
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'::uuid
);

-- Artist profile: Mara Okonkwo (ceramics).
insert into public.featured_articles (
  id,
  slug,
  title,
  excerpt,
  cover_image_url,
  cover_image_storage_path,
  blocks,
  status,
  published_at,
  home_sort_order,
  created_by
)
select
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'::uuid,
  'mara-okonkwo-the-kiln-is-a-conversation',
  'Mara Okonkwo: the kiln is a conversation',
  'How a London-based ceramicist draws on family recipes and market-day textures to make wheel-thrown pieces that sell out in minutes — and why she still mixes every glaze by hand.',
  'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1600&q=82&auto=format&fit=crop'::text,
  null,
  jsonb_build_array(
    jsonb_build_object(
      'type', 'heading',
      'text', 'The first thing you notice is the quiet',
      'level', 1
    ),
    jsonb_build_object(
      'type', 'paragraph',
      'text',
      $m1$
Mara Okonkwo works out of a narrow studio in Peckham where the windows fog in winter and the shelves are crowded with tests: tiny bowls labeled in pencil, streaks of ash glaze, a line of cups that failed because the kiln cooled too fast. She laughs when people call her process meditative. "It is not calm," she says. "It is listening. Clay tells you when you are lying."
$m1$
    ),
    jsonb_build_object(
      'type', 'heading',
      'text', 'From the kitchen table to the auction block',
      'level', 2
    ),
    jsonb_build_object(
      'type', 'paragraph',
      'text',
      $m2$
Okonkwo grew up between Lagos and London, moving for school and staying for love and lease agreements. Her early pots borrowed shapes from the enamelware her aunt stacked after Sunday lunch — wide rims, generous feet, colors that did not apologize. When she began selling online, buyers responded to the same thing: objects that felt already lived-in, as if the first owner were simply the next person in line.
$m2$
    ),
    jsonb_build_object(
      'type', 'quote',
      'text',
      'I am not chasing perfection. I am chasing the moment the piece stops asking questions and starts holding them for someone else.',
      'attribution', 'Mara Okonkwo'
    ),
    jsonb_build_object(
      'type', 'paragraph',
      'text',
      $m3$
Her ES Neelan drops are small by design — twelve to twenty pieces, announced with little more than a date and a photograph of greenware still drying on wire racks. They sell out quickly, which frustrates newcomers and delights collectors who set reminders. Okonkwo is unsentimental about the speed: "If it finds a home, the work did its job. I will make more. The kiln does not care about FOMO."
$m3$
    ),
    jsonb_build_object(
      'type', 'qa',
      'question', 'What should someone know before collecting your work?',
      'answer',
      $m4$
Treat it like daily ware unless it is marked decorative. I fire hot enough for durability, but ceramics still dislike sudden temperature shocks. If a piece chips, send a photo — I keep notes on every batch and I can often tell you whether it was a glaze fit issue or a hard knock. I would rather repair trust than pretend porcelain is magic.
$m4$
    ),
    jsonb_build_object(
      'type', 'fact_card',
      'title', 'Studio sheet',
      'facts', jsonb_build_array(
        $mf1$Clay: stoneware bodies, occasional porcelain for lamp bases.$mf1$,
        $mf2$Firing: gas reduction to cone 10; slow cool for crystalline ash effects on select glazes.$mf2$,
        $mf3$Public hours: first Saturday of the month, by appointment otherwise.$mf3$
      )
    ),
    jsonb_build_object(
      'type', 'inline_action',
      'label', 'Browse ceramics and studio pottery on ES Neelan',
      'href', '/(tabs)/explore',
      'auction_id', null
    )
  ),
  'published'::public.featured_article_status,
  timezone('utc', now()) - interval '36 hours',
  2,
  author.id
from (
  select coalesce(
    (select p.id from public.profiles p where p.role = 'admin' and p.suspended_at is null order by p.created_at asc limit 1),
    (select p.id from public.profiles p order by p.created_at asc limit 1)
  ) as id
) as author;

-- Artist profile: James Calder (painting).
insert into public.featured_articles (
  id,
  slug,
  title,
  excerpt,
  cover_image_url,
  cover_image_storage_path,
  blocks,
  status,
  published_at,
  home_sort_order,
  created_by
)
select
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'::uuid,
  'james-calder-neon-rain-and-the-honesty-of-sketches',
  'James Calder: neon rain and the honesty of sketches',
  'The Glasgow painter on late buses, wet pavement as color theory, and why his first major series started as pocket-sized drawings he almost threw away.',
  'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1600&q=82&auto=format&fit=crop'::text,
  null,
  jsonb_build_array(
    jsonb_build_object(
      'type', 'heading',
      'text', 'City light, translated',
      'level', 1
    ),
    jsonb_build_object(
      'type', 'paragraph',
      'text',
      $j1$
James Calder paints the way some people keep voice memos — quick, greedy, a little embarrassed by sincerity. His canvases look like stills from a night you swear you remember: taxi rank puddles, chip-shop steam catching pink LED, a cyclist slicing through drizzle. Up close the surfaces are rude with scrapes and dry-brush; step back and the scene locks into place like a door shutting quietly.
$j1$
    ),
    jsonb_build_object(
      'type', 'heading',
      'text', 'From sketchbook margins to linen',
      'level', 2
    ),
    jsonb_build_object(
      'type', 'paragraph',
      'text',
      $j2$
For years Calder treated sketches as private evidence — not preparatory "studies" for something grander, but finished thoughts in miniature. A residency in Berlin changed his mind when a curator pinned forty pocket drawings to a wall and the room felt like a single weather system. His recent large works lift compositions directly from those pages, blow them up, and refuse to tidy the awkward edges. "If the crop feels violent," he says, "the city felt that way too."
$j2$
    ),
    jsonb_build_object(
      'type', 'quote',
      'text',
      'Rain is the cheapest diffuser in the world. Neon is rude. Put them together and honesty stops being a moral word and becomes a color problem.',
      'attribution', 'James Calder, studio interview'
    ),
    jsonb_build_object(
      'type', 'paragraph',
      'text',
      $j3$
Collectors who met him through ES Neelan often mention the titles first — half joke, half poem — and then the way his auction lots photograph under flat light. Calder insists on neutral documentation: "The painting should survive bad lighting because apartments have bad lighting." He numbers his editions of prints strictly and keeps a public log of which variants exist, a habit he picked up from mistrusting opaque markets early in his career.
$j3$
    ),
    jsonb_build_object(
      'type', 'qa',
      'question', 'Do you take commissions?',
      'answer',
      $j4$
Rarely, and only when the brief leaves room for my weather. I will not copy a photograph of someone’s dog unless the dog has interesting politics. If you want a city piece, tell me the intersection and what you miss about it — I will read that harder than any Pinterest board.
$j4$
    ),
    jsonb_build_object(
      'type', 'fact_card',
      'title', 'On the easel',
      'facts', jsonb_build_array(
        $jf1$Medium: oil on linen; occasional acrylic ground for speed on smaller works.$jf1$,
        $jf2$Current series: "Neon Rain" — urban nocturnes, 2024–present.$jf2$,
        $jf3$Representation: studio-direct releases; selected charity auctions yearly.$jf3$
      )
    ),
    jsonb_build_object(
      'type', 'inline_action',
      'label', 'See paintings and works on paper on ES Neelan',
      'href', '/(tabs)/explore',
      'auction_id', null
    )
  ),
  'published'::public.featured_article_status,
  timezone('utc', now()) - interval '90 minutes',
  0,
  author.id
from (
  select coalesce(
    (select p.id from public.profiles p where p.role = 'admin' and p.suspended_at is null order by p.created_at asc limit 1),
    (select p.id from public.profiles p order by p.created_at asc limit 1)
  ) as id
) as author;

commit;
