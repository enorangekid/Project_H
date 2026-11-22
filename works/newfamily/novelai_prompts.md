> 이미지 폴더 정리 (2026-11-22): `novelai/` 아래를 `캐릭터/`·`씬/`·`배경/`으로 나눔. 캐릭터는 그 아래 **인물 폴더**(임신혜·진소영·진미소·윤서아·김선하·루시·미요시·시안·서하람)에 넣음 — 작업실 CG 캐릭터 탭의 하위 탭. 씬은 인물로 나누지 않고 `씬/` 바로 아래(작업실에서 EP·SP별로 묶임). 캐릭터 = `캐릭터/인물/인물영문_종류.png`(확정 디자인은 `_design`), 씬 = `씬/씬ID_P단계_설명.png`(대본 씬과 짝이 확실한 것만, 나머지는 원래 이름 그대로), 배경 = `배경/bg_장소_시간.png`. 인물 폴더에 안 맞는 것(예: 진태석)은 탭 폴더 바로 아래 → 작업실에서 "기타" 하위 탭.

# NovelAI 프롬프트 모음 (진미소 / 캄쟈풍 게임 CG 탐색)

> ★핵심 원칙 (2026-11-20): 장면 프롬프트는 최소로. 캐릭터 기본 태그 + 옷 + 배경 + 동작 한 단어(예: `stretching`)만.
> 자세·앵글·수정 태그를 계속 덧붙이면 서로 충돌해서 더 꼬임. 안 나오면 태그 추가 말고 시드 재시도.
> (소영 홈짐 스트레칭: 자세 태그 10개 넣었을 땐 계속 실패 → `stretching` 하나로 바로 성공)

---

## ★루시 외전 SP1~3 CG 1차 (확정, 2026-11-21) — 원고: GitHub enorangekid/Project_H works/newfamily/data/scenes/SP1~3.js
원고 장면별 옷차림을 최소 태그로. 이미지 파일 이름은 `novelai/씬/SP<번호>_P<단계>_<설명>.png`로 저장 권장 (이미지 파일 저장 필요).
- 공통 교훈: 루시 앞머리가 무거운 일자로 나오면 UC `blunt bangs`. 섹스씬은 Prompt `male pubic hair` + UC 남자 몸털 부위별.
- 공통 Prompt(B+) = `masterpiece, best quality, amazing quality, very aesthetic, best illustration, absurdres, incredibly absurdres, extremely detailed, ultra detailed, intricate detail, year2025, vibrant colors, clean lineart, comic shading, best shadow, shiny skin, realistic skin texture, detailed facial skin, detailed eyes, detailed body, soft gradient shading, peach skin, subsurface scattering, rim light, depth of field, light particles,` + 아래 [장면].
- 루시 얼굴 공통 = `1girl, k-pop idol, black hair, short bob cut, chin-length hair, see-through bangs, hair flipped out at ends, almond-shaped eyes, slightly upturned eyes, double eyelids, korean-style eyes with defined double eyelids, mole under left eye, full lips`
- 루시 UC 공통 = `lowres, blurry, worst quality, bad anatomy, bad hands, extra arms, extra fingers, extra legs, child, chibi, old, muscular, abs, long hair, brown hair, blonde hair, heterochromia, 3d, realistic, photo, frame, border, text, watermark, signature, white outline, glowing outline, halo, flat color, sketch, large eyes, round eyes, doll eyes, eye bags, dark circles, mole under right eye, flat chest, small breasts, huge breasts`
- 섹스 UC 추가분 = `censored, mosaic censoring, bar censor, male face, deformed penis, extra penis, completely nude, other people, hairy legs, leg hair, arm hair, chest hair, male body hair`

| # | 장면 (크기) | [장면] (Prompt 뒤에) | 캐릭터 1 (얼굴 공통 뒤에) | UC (공통 뒤에) |
|---|---|---|---|---|
| 1 | SP1-P1 밤의 연습실 (768×1344) | `indoors, dance practice room, large mirror, night, dim lighting, wooden floor, detailed background, cowboy shot, no text` | `coral glossy lips, cold expression, wary, looking at viewer, tall, long legs, 0.8::athlete::, 0.8::toned body::, healthy skin, slim waist, 1.15::large breasts::, wide hips, thick thighs, light sweat, black sports bra, grey oversized t-shirt tied at waist, midriff, black short leggings, standing, turning around` | `narrow eyes, half-closed eyes, sparkling eyes, skinny, smile, other people, reflection of other people, nsfw` |
| 2 | SP1-P2 골목 키스 직전 (1344×768) | `outdoors, narrow alley, night, street lamp, pov, close-up, upper body, detailed background, no text` | `coral glossy lips, half-closed eyes, blush, parted lips, looking at viewer, face close to viewer, 0.8::athlete::, 0.8::toned body::, healthy skin, 1.15::large breasts::, black sports bra, grey oversized t-shirt, arm hug, hugging viewer's arm, breast press` | `other people, male face, kiss, nsfw` — ※ 위에서 내려다보는 각도로 나옴 → 다음엔 Prompt `eye level` + UC `from above` (원고: 눈높이 비슷) |
| 3 | SP2-P1 속옷 매장 피팅룸 (1344×768) | `ecchi, indoors, fitting room, curtain, mirror, bright lighting, from behind, cowboy shot, detailed background, no text` | `coral glossy lips, teasing smile, looking back at viewer, tall, 0.8::athlete::, 0.8::toned body::, healthy skin, slim waist, 1.15::large breasts::, wide hips, back, shoulder blades, light pink lace bra, unfastened bra, bra hooks open, denim mini skirt, standing` | `nipples, other people, 1boy, nsfw` |
| 4 | SP2-P3 대기실 펠라치오 (1344×768) | `nsfw, explicit, uncensored, clothed sex, pov, from above, male pubic hair, indoors, backstage dressing room, vanity mirror with light bulbs, sofa, warm lighting, detailed background, no text` | `red lipstick, stage makeup, eyeliner, smiling eyes, looking up at viewer, 0.8::athlete::, 0.8::toned body::, healthy skin, slim waist, 1.15::large breasts::, black leather corset top, short pleated skirt, kneeling, fellatio, penis in mouth, hand on penis, saliva` | 섹스 UC + `reflection` |
| 5 | SP2-P4 대기실 기승위 (1344×768) | `nsfw, explicit, uncensored, sex, vaginal, clothed sex, pov, from below, male pubic hair, indoors, backstage dressing room, vanity mirror with light bulbs, sofa, warm lighting, detailed background, no text` | `red lipstick, stage makeup, blush, seductive smile, looking down at viewer, 0.8::athlete::, 0.8::toned body::, healthy skin, slim waist, 1.15::large breasts::, wide hips, thick thighs, black leather corset top, short pleated skirt, skirt lift, no panties, straddling, cowgirl position, girl on top, hand on viewer's shoulder, penis in pussy, pussy` | 섹스 UC + `reflection` |
| 6 | SP3-P1 아침 침대 펠라치오 (1344×768) | `nsfw, explicit, uncensored, pov, from above, male pubic hair, indoors, bedroom, bed, morning sunlight, detailed background, no text` | `coral glossy lips, smiling eyes, looking up at viewer, 0.8::athlete::, 0.8::toned body::, healthy skin, 1.15::large breasts::, light grey off-shoulder knit dress, collarbone, dress slipping off shoulder, kneeling on bed, fellatio, penis in mouth, hand on penis` | 섹스 UC + `sleeping` (CG는 주인공이 깨어 눈 마주친 순간) |
| 7 | SP3-P3 크리스마스이브 키스 (1344×768, 2인: 루시 C3 / 남자 D3) | `1girl, 1boy, kiss, french kiss, tongue, saliva trail, indoors, living room, christmas tree, christmas lights, night, dim warm lighting, from side, upper body, close-up, detailed background, no text` | 루시: `closed eyes, blush, tears, smeared makeup, 0.8::athlete::, 0.8::toned body::, healthy skin, 1.15::large breasts::, red velvet dress, white fur trim, kissing, hands on boy's face` / 캐릭터 2: `1boy, short dark brown hair, white shirt, closed eyes, kissing, face partially hidden` | `extra person, beard, nsfw` — ※ 원피스가 비닐 산타복+방울로 나옴 → `1.2::red velvet dress::` + UC `latex, shiny clothes, pom pom (clothes), santa costume` |
| 8 | SP3-P4 거실 피아노 기승위 (1344×768) | `nsfw, explicit, uncensored, sex, vaginal, clothed sex, pov, male pubic hair, indoors, living room, grand piano, christmas tree, christmas lights, night, dim warm lighting, detailed background, no text` | `coral glossy lips, blush, half-closed eyes, looking at viewer, 0.8::athlete::, 0.8::toned body::, healthy skin, slim waist, 1.15::large breasts::, wide hips, thick thighs, red velvet dress, white fur trim, dress pulled down, breasts out, nipples, torn black pantyhose, panties pulled aside, straddling, cowgirl position, sitting on lap, penis in pussy, pussy` | 섹스 UC |
- 아직 안 만든 루시 장면: SP3-P5 욕실, P6 미소의 방(포스터), P7 내 방, P8 에필로그(한강 산책로, 빈 출국).

## ★미요시(아야카) 외전 SP4~6 CG 1차 (확정, 2026-11-21) — 원고: SP4~6.js
원고 묘사("화장기 없는 얼굴, 아무렇게나 낮게 묶은 머리에서 잔머리")에 맞춰 확정 미요시 태그에서 `tight low bun`→`low bun, messy hair`, 립글로스→`no makeup`. 가슴 `medium breasts`(원고: 손바닥에 꼭 맞는 크기). 에필로그는 히메컷 새 모습. 이미지 `novelai/씬/SP<번호>_P<단계>_<설명>.png` (이미지 파일 저장 필요).
- 공통 Prompt(B+) = 루시 외전과 동일 + [장면].
- 미요시 얼굴 공통 = `1girl, japanese, mature female, elegant, black hair, center part, slicked back hair, low bun, messy hair, loose strands framing face, forehead, oval face, defined cheekbones, sharp jawline, almond-shaped eyes, medium eyes, double eyelids, dark brown eyes, small eye highlights, natural eyelashes, natural straight eyebrows, full lips, fair skin`
- 미요시 UC 공통 = `lowres, blurry, worst quality, bad anatomy, bad hands, extra arms, extra fingers, extra legs, child, chibi, old, wrinkles, narrow eyes, muscular, abs, bangs, long loose hair, brown hair, blonde hair, heterochromia, 3d, realistic, photo, frame, border, text, logo, watermark, signature, white outline, glowing outline, halo, flat color, sketch, large eyes, round eyes, sparkling eyes, long eyelashes, thick eyelashes, doll eyes, eye bags, dark circles, earrings, jewelry, tan, dark skin, huge breasts, large breasts, flat chest, round face, baby face`
- 섹스 UC 추가분 = 루시 외전과 동일.

| # | 장면 (크기) | [장면] | 캐릭터 1 (얼굴 공통 뒤에) | UC (공통 뒤에) |
|---|---|---|---|---|
| 1 | SP4-P2 악보 가게 (1344×768) | `indoors, old sheet music store, tall wooden bookshelves, shelves full of sheet music, warm lighting, detailed background, cowboy shot, no text` | `no makeup, expressionless, cold gaze, looking at viewer, tall, slender, long legs, slim waist, medium breasts, long beige trench coat, black turtleneck sweater, holding sheet music, standing` | `smile, other people, nsfw` |
| 2 | SP4-P4 304호 레슨실 (1344×768) | `indoors, small lesson room, grand piano, cello leaning against wall, evening, window light, detailed background, cowboy shot, no text` | `no makeup, stern, cold expression, looking at viewer, tall, slender, slim waist, medium breasts, black turtleneck sweater, black wide slacks, sitting on chair beside piano, arms crossed` | `smile, playing cello, other people, nsfw` |
| 3 | SP4-P6 호이리게 (1344×768) | `outdoors, wine tavern garden, long wooden table, grapevines overhead, string lights, evening, blurry people in background, detailed background, upper body, no text` | (`loose strand of hair falling over face`로) `no makeup, slightly drunk, blush, looking down, slender, medium breasts, thin grey cardigan, white blouse, sitting at table, holding wine glass` | `smile, clear faces in crowd, trench coat, nsfw` |
| 4 | SP4-P7 현관 첫 키스 (1344×768, 2인: 미요시 C3 / 남자 D3) | `1girl, 1boy, kiss, against door, apartment entrance, night, dim lighting, from side, upper body, close-up, detailed background, no text` | 미요시: `1girl, japanese, mature female, black hair, low bun, messy hair, loose strands framing face, fair skin, no makeup, closed eyes, blush, flustered, stiff, back against door, kissing, hands gripping boy's shirt, thin grey cardigan, white blouse` / 캐릭터 2: `1boy, short dark brown hair, white shirt, closed eyes, kissing, face partially hidden` | `tongue, french kiss, extra person, beard, nsfw` |
| 5 | SP5-P1~2 첫 밤 + 출혈 (1344×768) | `nsfw, explicit, uncensored, sex, vaginal, defloration, small amount of blood, pov, missionary, male pubic hair, indoors, small bedroom, small bed, night, dim lighting, detailed background, no text` | (`hair bun on pillow` 추가, 가슴 `0.9::medium breasts::`) `no makeup, blush, biting own lip, embarrassed, teary eyes, looking at viewer, slender, slim waist, unbuttoned white blouse, open blouse, white cotton bra pushed up, nipples, lying on back, on bed, spread legs, penis in pussy, pussy` | `short hair, 1.2::large breasts::, lace bra, lingerie, excessive blood, injury, wound` + 섹스 UC — 교훈: 1차에 가슴 과함·머리 풀림. 출혈은 `defloration`(안 보이면 1.2, 과하면 `blood on sheets`) |
| 6 | SP5-P7 콘서트홀 박스석 (1344×768) — **아직 안 뽑음** | `nsfw, explicit, uncensored, sex, vaginal, clothed sex, standing sex, sex from behind, pov, from behind, male pubic hair, indoors, concert hall private box, red velvet seats, balcony railing, dark audience below, bright stage in distance, dim lighting, detailed background, no text` | `light lipstick, blush, covering own mouth, hand over mouth, looking back at viewer, tall, slender, slim waist, medium breasts, black dress, dress lift, panties pulled down, bent over railing, holding railing, penis in pussy, ass` | `completely nude, clear faces in crowd` + 섹스 UC |
| 7 | SP5-P8 드레스 맨발 첼로 (1344×768) | `indoors, small apartment living room, night, warm lamp light, detailed background, cowboy shot, no text` | `light lipstick, closed eyes, calm, peaceful, tall, slender, medium breasts, black dress, barefoot, sitting on chair, playing cello, cello between legs, holding bow` | `violin, guitar, shoes, other people, nsfw` |
| 8 | SP6-P6 밤의 공원 밧줄 (1344×768) | `nsfw, explicit, uncensored, pov, from above, male pubic hair, outdoors, riverside park, night, street lamp, darkness, detailed background, no text` | `blush, embarrassed, trembling, looking up at viewer, slender, slim waist, medium breasts, open trench coat, beige trench coat, naked under coat, shibari, red rope, rope around breasts, kneeling on ground, fellatio, penis in mouth` | `other people, blood, injury` + 섹스 UC (`completely nude` 제외) |
| 9 | SP6-P7 에필로그 히메컷 (1344×768) | `indoors, airport terminal, large windows, airplane outside, daylight, detailed background, cowboy shot, no text` | 얼굴 공통 대신: `1girl, japanese, mature female, elegant, hime cut, long straight black hair, blunt bangs, sidelocks, small pearl earrings, oval face, almond-shaped eyes, medium eyes, double eyelids, dark brown eyes, natural eyelashes, full lips, coral glossy lips, fair skin, faint smile, looking at viewer, tall, slender, slim waist, medium breasts, light blue blouse, white pleated skirt, below-knee skirt, standing, holding cello case` | UC 공통에서 `bangs, long loose hair, earrings, jewelry` 빼고 + `low bun, hair bun, trench coat, necklace, other people, nsfw` |
- 아직 안 만든 미요시 장면: SP4-P3 교수 연구실, SP5-P3 침대 후배위, P4 아침 첼로 케이스, P5 소파 팔걸이, SP6-P5 실기 시험.

---

## ★캐릭터별 가슴 크기 기준 (2026-11-21 사용자 지정)
순서: 신혜 > 소영 = 루시 > 미소 (여기까지 거유) | 서아 (작지 않음) | 미요시 (이들에 비하면 작음). 선하는 대상 아님.
새 프롬프트부터 아래 가중치 적용 (기존 확정 이미지는 그대로). 아직 테스트 전 — 결과 보고 조정.
| 캐릭터 | 태그 | UC |
|---|---|---|
| 신혜 | `1.25::large breasts::` (+ `voluptuous`) | `gigantic breasts` |
| 소영 / 루시 | `1.15::large breasts::` | `huge breasts` |
| 미소 | `1.05::large breasts::` | `huge breasts` |
| 서아 | `0.9::large breasts::` | `huge breasts, small breasts, flat chest` |
| 시안 | `0.8::large breasts::` (미요시보다 조금 큼) | `huge breasts, flat chest` |
| 미요시 | `medium breasts` | `large breasts, huge breasts, flat chest, small breasts` |
- 가중치 1.3 이상은 `huge breasts` 쪽으로 넘어갈 위험(신혜 `huge breasts` 과함 교훈). 단계 차이가 안 보이면 0.05씩 조정.

---

## ★캐릭터 스탠딩 CG 기본 틀 (2026-11-21 확정) — 스탠딩 뽑을 땐 항상 이 틀
흰 배경 + 허벅지 컷(cowboy shot) + 832×1216 세로. 캐릭터 1은 확정 얼굴·체형 태그 + 기본 표정 + 의상 + 포즈만 교체.
- 핵심: `game cg` + `studio lighting` → 흰 배경에서도 게임 CG 렌더링 유지. `character design`은 컨셉아트/수채화풍으로 밋밋해져서 금지. `depth of field, light particles, detailed background`는 제외.
- 교훈: `full body, wide shot, head to toe` → 8등신 모델 체형으로 늘어짐 → 미연시식 허벅지 컷이 나음. 디테일 얼굴 태그 많으면 얼굴 클로즈업으로 끌림 → `1.2::cowboy shot::` + UC `upper body, portrait, close-up`. `slight smile`은 표정 존재감 약함 → 캐릭터 고유 표정으로. 배경 있는 CG 뽑고 따는 방법(ComfyUI BiRefNet/rembg)도 가능.
- 흰 배경에 그림자/바닥 생기면 UC에 `indoors, outdoors, floor, shadow on ground` 추가.
- 후처리 (2026-11-21): NovelAI Enhance 1.5배(Strength 0.2~0.35)로 업스케일 → 누끼는 포토룸(Photoroom)으로. 흰 가운+흰 배경(서아)도 잘 따짐 → ComfyUI 배경 제거 노드 불필요.
- 머리·팔이 프레임 밖으로 잘림 → UC에 `head out of frame, cropped head, arms out of frame, cropped arms, cropped shoulders, cut off` (그냥 `cropped`는 허벅지 컷까지 막으니 금지). Prompt에 `space above head`. 계속 잘리면 캔버스를 1024×1024 정사각형으로 하거나 팔꿈치가 벌어지는 포즈(`hand on hip`) 대신 `arms at sides`.

### 소영 스탠딩 (확정) — 이미지 `novelai/캐릭터/진소영/soyoung_standing.png` (이미지 파일 저장 필요)
Prompt (스탠딩 공통):
```
masterpiece, best quality, amazing quality, very aesthetic, best illustration, absurdres, incredibly absurdres, extremely detailed, ultra detailed, intricate detail, year2025, game cg, vibrant colors, clean lineart, comic shading, best shadow, shiny skin, realistic skin texture, detailed facial skin, detailed eyes, detailed body, soft gradient shading, peach skin, subsurface scattering, rim light, studio lighting, simple background, white background, 1.2::cowboy shot::, standing, centered, no text
```
캐릭터 1:
```
1girl, long straight black hair, center part, forehead, no bangs, almond-shaped eyes, medium eyes, double eyelids, dark grey eyes, small eye highlights, natural eyelashes, natural straight eyebrows, korean-style eyes with defined double eyelids, full lips, coral glossy lips, expressionless, calm expression, closed mouth, indifferent gaze, looking at viewer, 0.8::athlete::, 0.8::toned body::, healthy skin, slim waist, large breasts, white sports bra, midriff, grey leggings, standing, hand on hip
```
UC (스탠딩 공통 + 소영 머리/표정분):
```
lowres, blurry, worst quality, bad anatomy, bad hands, extra arms, extra fingers, extra legs, child, chibi, old, narrow eyes, half-closed eyes, muscular, abs, streaked hair, brown hair, blonde hair, blue hair, heterochromia, 3d, frame, border, text, watermark, signature, white outline, glowing outline, halo, flat color, sketch, watercolor, traditional media, lineart only, pale colors, washed out, large eyes, round eyes, sparkling eyes, long eyelashes, thick eyelashes, doll eyes, eye bags, dark circles, other people, scenery, full body, feet, close-up, portrait, upper body, from above, from below, cameltoe, sweat, wet skin, nsfw, smile, frown, furrowed brow, glaring, angry, blush
```

### ★소영 스탠딩 v2 — 폴로 원피스 (일단 확정, 2026-11-21) — 이미지 `novelai/캐릭터/진소영/soyoung_standing_polo.png` (이미지 파일 저장 필요)
위 운동복 버전보다 이쪽을 소영 대표 스탠딩으로. Prompt = 스탠딩 공통 + `space above head`.
- 교훈: 표정 `slight smile`(존재감 약함) / `expressionless`(소영 느낌 안 남) → `calm expression, smirk`. 포즈 `hand on hip`은 루시와 겹침 → `crossed arms`(쿨, 프레임 안 잘림).
- 개선 후보: 머리가 과하게 길고 넓게 퍼짐 → UC에 `absurdly long hair, very long hair, floating hair`.
캐릭터 1:
```
1girl, long straight black hair, center part, forehead, no bangs, almond-shaped eyes, medium eyes, double eyelids, dark grey eyes, small eye highlights, natural eyelashes, natural straight eyebrows, korean-style eyes with defined double eyelids, full lips, coral glossy lips, calm expression, smirk, looking at viewer, 0.8::athlete::, 0.8::toned body::, healthy skin, slim waist, large breasts, light blue polo dress, white collar, v-neck, half sleeves, tight dress, short dress, cleavage, standing, crossed arms
```
UC:
```
lowres, blurry, worst quality, bad anatomy, bad hands, extra arms, extra fingers, extra legs, child, chibi, old, narrow eyes, half-closed eyes, muscular, abs, streaked hair, brown hair, blonde hair, blue hair, heterochromia, 3d, frame, border, text, watermark, signature, white outline, glowing outline, halo, flat color, sketch, watercolor, traditional media, lineart only, pale colors, washed out, large eyes, round eyes, sparkling eyes, long eyelashes, thick eyelashes, doll eyes, eye bags, dark circles, other people, scenery, full body, feet, close-up, portrait, upper body, from above, from below, nipples, sweat, wet skin, nsfw, frown, furrowed brow, glaring, angry, blush, grin, head out of frame, cropped head, arms out of frame, cropped arms, cropped shoulders, cut off
```

### ★윤서아 스탠딩 (확정, 2026-11-21) — 아래 "윤서아" 캐릭터 섹션에 전체 블록

### ★미소 스탠딩 (확정, 2026-11-21) — 이미지 `novelai/캐릭터/진미소/miso_standing.png` (이미지 파일 저장 필요)
Prompt = 스탠딩 공통 + `space above head`.
캐릭터 1:
```
1girl, k-pop idol, long straight dark brown hair, waist-length hair, face-framing strands, almond-shaped eyes, medium eyes, double eyelids, dark grey eyes, small eye highlights, natural eyelashes, natural straight eyebrows, korean-style eyes with defined double eyelids, full lips, coral glossy lips, playful smile, open mouth, looking at viewer, slim waist, slim stomach, large breasts, round butt, long legs, white cropped t-shirt, midriff, pink dolphin shorts, standing, arms behind back
```
UC:
```
lowres, blurry, worst quality, bad anatomy, bad hands, extra arms, extra fingers, extra legs, child, chibi, old, narrow eyes, half-closed eyes, muscular, abs, streaked hair, black hair, blonde hair, heterochromia, 3d, frame, border, text, watermark, signature, white outline, glowing outline, halo, flat color, sketch, watercolor, traditional media, lineart only, pale colors, washed out, large eyes, round eyes, sparkling eyes, long eyelashes, thick eyelashes, doll eyes, eye bags, dark circles, thin eyebrows, latex, leather, shiny clothes, glossy clothes, plastic clothes, other people, scenery, full body, feet, close-up, portrait, upper body, from above, from below, cameltoe, nipples, covered nipples, sweat, wet skin, nsfw, head out of frame, cropped head, arms out of frame, cropped arms, cropped shoulders, cut off
```
### ★신혜 스탠딩 (확정, 2026-11-21) — 이미지 `novelai/캐릭터/임신혜/shinhye_standing.png` (이미지 파일 저장 필요)
Prompt = 스탠딩 공통 + `space above head`.
- 교훈: `cardigan`은 니트로 학습돼 있어 니트 질감이 나옴 → `matching dark purple thin cardigan, jersey fabric, smooth fabric` + UC `knit, knitted fabric, ribbed, cable knit, sweater, wool`. 그래도 니트면 `cardigan` 단어 빼고 `thin long-sleeve wrap`.
캐릭터 1:
```
1girl, medium brown hair, warm brown hair, center part, soft voluminous hair, side-swept hair over temples, low bun at nape, loose strands framing face, almond-shaped eyes, medium eyes, double eyelids, brown eyes, small eye highlights, natural eyelashes, defined straight eyebrows, korean-style eyes with defined double eyelids, full lips, pink glossy lips, gentle smile, looking at viewer, mature female, sensual, voluptuous, narrow waist, 1.2::large breasts::, wide hips, round butt, dark purple halter dress, sleeveless, tight dress, short dress, cleavage, matching dark purple thin cardigan, jersey fabric, smooth fabric, cardigan hanging off shoulders, standing, hand on own neck, other arm at side
```
UC:
```
lowres, blurry, worst quality, bad anatomy, bad hands, extra arms, extra fingers, extra legs, child, chibi, old, wrinkles, narrow eyes, half-closed eyes, muscular, abs, black hair, blonde hair, light brown hair, ash blonde hair, pale hair, bangs, blunt bangs, high bun, slicked back hair, heterochromia, 3d, frame, border, text, watermark, signature, white outline, glowing outline, halo, flat color, sketch, watercolor, traditional media, lineart only, pale colors, washed out, large eyes, round eyes, sparkling eyes, long eyelashes, thick eyelashes, doll eyes, eye bags, dark circles, latex, leather, shiny clothes, knit, knitted fabric, ribbed, cable knit, sweater, wool, huge breasts, gigantic breasts, oily skin, other people, scenery, full body, feet, close-up, portrait, upper body, from above, from below, nipples, sweat, wet skin, nsfw, head out of frame, cropped head, arms out of frame, cropped arms, cropped shoulders, cut off
```

### ★루시 스탠딩 (확정, 2026-11-21, 2장) — 이미지 `novelai/캐릭터/루시/lucy_standing_1.png`, `_2.png` (이미지 파일 저장 필요)
Prompt = 스탠딩 공통 + `space above head`. 한 번에 잘 나옴.
캐릭터 1:
```
1girl, k-pop idol, black hair, short bob cut, chin-length hair, see-through bangs, hair flipped out at ends, almond-shaped eyes, slightly upturned eyes, medium eyes, double eyelids, dark brown eyes, small eye highlights, natural eyelashes, natural straight eyebrows, korean-style eyes with defined double eyelids, mole under left eye, full lips, coral glossy lips, bright smile, smiling eyes, looking at viewer, tall, long legs, 0.8::athlete::, 0.8::toned body::, healthy skin, slim waist, large breasts, wide hips, thick thighs, curvy, black sleeveless turtleneck crop top, midriff, silver pendant necklace, denim mini skirt, standing, hand on hip
```
UC:
```
lowres, blurry, worst quality, bad anatomy, bad hands, extra arms, extra fingers, extra legs, child, chibi, old, narrow eyes, half-closed eyes, muscular, abs, long hair, brown hair, blonde hair, heterochromia, 3d, frame, border, text, watermark, signature, white outline, glowing outline, halo, flat color, sketch, watercolor, traditional media, lineart only, pale colors, washed out, large eyes, round eyes, sparkling eyes, long eyelashes, thick eyelashes, doll eyes, eye bags, dark circles, mole under right eye, closed eyes, skinny, slender, flat chest, small breasts, stage, microphone, other people, scenery, full body, feet, close-up, portrait, upper body, from above, from below, nipples, sweat, wet skin, nsfw, head out of frame, cropped head, arms out of frame, cropped arms, cropped shoulders, cut off
```

### 미요시 스탠딩 (임시 확정, 2026-11-21, 사용자 "느낌이 안 삼") — 이미지 `novelai/캐릭터/미요시/miyoshi_standing.png` (이미지 파일 저장 필요)
Prompt = 스탠딩 공통 + `space above head`. 코트 벗김. 미요시 UC의 `standing still`은 스탠딩과 충돌해서 제외.
- 개선 후보: 오버사이즈 스웨터+통 넓은 바지라 체형이 묻힘 → `fitted turtleneck, sweater tucked into slacks, black belt` / 바람 `loose strands blowing in the wind` / 코트 다시 입히기(확정 길거리 컷 느낌).
캐릭터 1:
```
1girl, japanese, mature female, elegant, sophisticated, black hair, center part, slicked back hair, tight low bun, loose strands framing face, forehead, oval face, defined cheekbones, sharp jawline, almond-shaped eyes, medium eyes, double eyelids, dark brown eyes, small eye highlights, eyeliner, natural eyelashes, natural straight eyebrows, full lips, coral glossy lips, fair skin, faint smile, calm gaze, looking at viewer, tall, slender, long legs, slim waist, medium breasts, black turtleneck sweater, black wide slacks, standing, hands in pockets
```
UC:
```
lowres, blurry, worst quality, bad anatomy, bad hands, extra arms, extra fingers, extra legs, child, chibi, old, wrinkles, narrow eyes, half-closed eyes, muscular, abs, bangs, long loose hair, brown hair, blonde hair, heterochromia, 3d, realistic, photo, frame, border, text, logo, watermark, signature, white outline, glowing outline, halo, flat color, sketch, watercolor, traditional media, lineart only, pale colors, washed out, large eyes, round eyes, sparkling eyes, long eyelashes, thick eyelashes, doll eyes, eye bags, dark circles, other people, earrings, hoop earrings, tan, dark skin, huge breasts, large breasts, flat chest, small breasts, necklace, jewelry, rings, round face, baby face, coat, trench coat, jacket, scenery, full body, feet, close-up, portrait, upper body, from above, from below, nipples, sweat, wet skin, nsfw, head out of frame, cropped head, arms out of frame, cropped arms, cropped shoulders, cut off
```

### ★선하 스탠딩 (확정, 2026-11-21, 일상 CG만) — 이미지 `novelai/캐릭터/김선하/seonha_standing.png` (이미지 파일 저장 필요)
Prompt = 스탠딩 공통에서 `detailed body` 제외 + `space above head`. 선하 UC의 `standing still, portrait, looking at viewer, simple background`는 스탠딩과 충돌해서 제외.
캐릭터 1:
```
1girl, black hair, high ponytail, see-through bangs, almond-shaped eyes, medium eyes, double eyelids, dark brown eyes, korean-style eyes with defined double eyelids, natural straight eyebrows, quiet expression, looking at viewer, slim, korean school uniform, white collared shirt, red necktie, black v-neck knit vest with white trim, grey pencil skirt, black backpack, green frog plush keychain hanging from backpack zipper, standing, holding backpack strap
```
UC:
```
lowres, blurry, worst quality, bad anatomy, bad hands, extra arms, extra fingers, extra legs, chibi, old, 3d, realistic, photo, frame, border, text, watermark, signature, flat color, sketch, watercolor, traditional media, lineart only, pale colors, washed out, japanese school uniform, sailor uniform, pleated skirt, long skirt, large eyes, round eyes, doll eyes, shoulder bag, tote bag, keychain in hand, bear keychain, other people, scenery, full body, feet, close-up, upper body, from above, from below, high angle, head out of frame, cropped head, arms out of frame, cropped arms, cropped shoulders, cut off, nsfw, cleavage, large breasts, midriff, short skirt, makeup
```

- 교훈: 미소는 `k-pop idol` + `playful smile` 같은 강한 기준 태그가 있어서 스탠딩에서도 캐릭터성이 잘 유지됨. 소영은 무표정+일반 태그라 흰 배경에서 개성이 약해짐.

---

## ★섹스씬 (V5 Full, 2026-11-20) — 옷 입은 채(clothed sex)가 완전 누드보다 묘사 훨씬 좋음
공통 Prompt = B+ + `nsfw, explicit, uncensored, (sex, vaginal,) clothed sex, pov, [장소]` / 남자는 pov로만(캐릭터 2 안 만듦)
공통 UC 추가: `censored, mosaic censoring, bar censor, male face, deformed penis, extra penis, completely nude`
체위 태그: 정상위 `lying on back, spread legs, missionary, penis in pussy, pussy` / 후배위 `bent over desk(on all fours), doggystyle, sex from behind, penis in pussy, pussy, ass` / 기승위 `straddling, cowgirl position, girl on top, penis in pussy, pussy` / 대딸 `kneeling, handjob, hand on penis, stroking penis` / 펠라 `kneeling, fellatio, penis in mouth, hand on penis`

| 이미지 | 캐릭터 | 의상 | 장소 |
|---|---|---|---|
| `novelai/씬/shinhye_sex_fellatio.png` | 신혜 (확정 머리·성숙미 태그) | `black suit jacket, open jacket, red lace bra, cleavage, black pencil skirt` | `luxury bedroom, night, warm dim lighting` |
| `novelai/씬/shinhye_sex_cowgirl.png` | 신혜 | 위 + `red lace bra pulled down, nipples, skirt lift, red lace panties pulled aside` | 동일 |
| `novelai/씬/EP12_P2_office_sex_cowgirl.png` | 소영 (건강미 태그) | `white blouse, unbuttoned blouse, bra pulled down, nipples, black pencil skirt, skirt lift, torn black pantyhose, navy blue panties pulled aside` + `straddling on office chair` | `office, night, desk` |
| `novelai/씬/EP12_P2_office_sex_doggy.png` | 소영 | `white blouse, black pencil skirt, skirt lift, torn black pantyhose, navy blue panties pulled aside, bent over desk, hands on desk` | 동일 |
| `novelai/씬/miso_sex_doggy.png` | 미소 | `completely nude, on all fours` | `bedroom, bed` |
| `novelai/씬/lucy_sex_cowgirl.png` | 루시 (확정 태그) | `black sleeveless turtleneck crop top, crop top lift, nipples, denim mini skirt, skirt lift, panties pulled aside` + 기승위, 표정 `blush, seductive smile, looking down at viewer` | `apartment, sofa, night` |
| `novelai/씬/miyoshi_sex_piano_doggy.png` | 미요시 (확정 태그) | `black turtleneck sweater, sweater lift, black wide slacks, slacks pulled down, black panties pulled down, bent over grand piano, hands on piano` + 후배위, 표정 `blush, parted lips, looking back at viewer` | `music practice room, grand piano, night, dim lighting` |
- 신혜 UC엔 `drunk, sleeping, unconscious` (깨어 있고 주도하는 장면만). 신혜 팬티 빨간 레이스, 소영 팬티 남색.

### ★영화관에서 보는 영화 속 SM 후배위 (확정, 2026-11-21) — 이미지 `novelai/씬/movie_actress_sm_doggy.png` (이미지 파일 저장 필요)
영화 속 배우(우리 캐릭터 아님) → 확정 얼굴 태그 없음, 뒷모습. 남자는 pov.
- 교훈: 1차 기승위 버전에서 `ash brown hair` → 회색 머리 → `light brown hair` + UC `grey hair, white hair`. 기승위→후배위 전환 시 `from below` 제거, UC에 기승위 태그 차단.
Prompt:
```
masterpiece, best quality, amazing quality, very aesthetic, best illustration, absurdres, incredibly absurdres, extremely detailed, ultra detailed, intricate detail, year2025, vibrant colors, clean lineart, comic shading, best shadow, shiny skin, realistic skin texture, detailed facial skin, detailed eyes, detailed body, soft gradient shading, peach skin, subsurface scattering, rim light, depth of field, light particles, nsfw, explicit, uncensored, sex, vaginal, bdsm, pov, from behind, back view, ass focus, indoors, japanese room, tatami, dim lighting, detailed background, no text
```
캐릭터 1:
```
1girl, mature female, medium hair, wavy hair, light brown hair, voluptuous, narrow waist, wide hips, large ass, thick thighs, sweat, red rope, rope harness, red string bikini, shibari, arms behind back, bound arms, face down, ass up, top-down bottom-up, doggystyle, sex from behind, penis in pussy, pussy, ass
```
UC:
```
lowres, blurry, worst quality, bad anatomy, bad hands, extra arms, extra fingers, extra legs, child, chibi, old, 3d, frame, border, text, watermark, signature, white outline, glowing outline, halo, flat color, sketch, censored, mosaic censoring, bar censor, male face, deformed penis, extra penis, face, looking back, other people, blood, injury, gag, crying, grey hair, white hair, girl on top, straddling, cowgirl position, reverse cowgirl position
```
- 자세 꼬이면 시드 재시도 → 그래도 안 되면 `arms behind back, bound arms` 빼고 `on all fours`. 사정 묘사는 `cum in pussy, cum overflow`.

### ★한소영 병실 기승위 전라 (확정, 2026-11-21) — 이미지 `novelai/씬/soyoung_hospital_sex_cowgirl.png` (이미지 파일 저장 필요)
소영 확정 태그 + 기승위. 전라라 공통 UC의 `completely nude` 제외. 남자는 pov.
- 교훈: `teary eyes` → 너무 욺. UC에 `sad` 넣으면 찡그린 눈썹까지 사라짐 → UC는 `tears, crying`만, 표정은 `troubled eyebrows`로 유지. 음모 과하면 `sparse pubic hair`.
Prompt:
```
masterpiece, best quality, amazing quality, very aesthetic, best illustration, absurdres, incredibly absurdres, extremely detailed, ultra detailed, intricate detail, year2025, vibrant colors, clean lineart, comic shading, best shadow, shiny skin, realistic skin texture, detailed facial skin, detailed eyes, detailed body, soft gradient shading, peach skin, subsurface scattering, rim light, depth of field, light particles, nsfw, explicit, uncensored, sex, vaginal, pov, from below, indoors, hospital room, hospital bed, night, dim lighting, detailed background, no text
```
캐릭터 1:
```
1girl, long straight black hair, center part, forehead, no bangs, almond-shaped eyes, medium eyes, double eyelids, dark grey eyes, small eye highlights, natural eyelashes, natural straight eyebrows, korean-style eyes with defined double eyelids, full lips, coral glossy lips, blush, troubled eyebrows, heavy breathing, open mouth, sweat, looking at viewer, 0.8::athlete::, 0.8::toned body::, healthy skin, slim waist, large breasts, nipples, nude, black pubic hair, straddling, cowgirl position, girl on top, penis in pussy, pussy
```
UC:
```
lowres, blurry, worst quality, bad anatomy, bad hands, extra arms, extra fingers, extra legs, child, chibi, old, narrow eyes, half-closed eyes, muscular, abs, streaked hair, brown hair, blonde hair, blue hair, heterochromia, 3d, frame, border, text, watermark, signature, white outline, glowing outline, halo, flat color, sketch, large eyes, round eyes, sparkling eyes, long eyelashes, thick eyelashes, doll eyes, eye bags, dark circles, censored, mosaic censoring, bar censor, male face, deformed penis, extra penis, other people, tears, crying
```

### ★한소영 병실 선 후배위 (벽 짚고, 확정, 2026-11-21) — 이미지 `novelai/씬/soyoung_hospital_sex_standing_doggy.png` (이미지 파일 저장 필요)
병실 기승위 다음 컷. 침대에서 내려와 선 채로 하는 후배위.
- 교훈: 침대 짚기는 침대 비율이 계속 이상함 → 침대 빼고 `against wall, hands on wall` + 병실은 `hospital curtain, iv stand`로 표현, UC `bed, hospital bed`. `on all fours`는 무릎 후배위가 됨 → `standing, bent over, standing sex` + UC `kneeling, on all fours`. 남자 몸털은 UC에 부위별(`hairy legs, leg hair, arm hair, chest hair, male body hair`) — `body hair` 통째로 막으면 음모까지 사라짐. 남자 음모는 Prompt에 `male pubic hair` 명시.
Prompt:
```
masterpiece, best quality, amazing quality, very aesthetic, best illustration, absurdres, incredibly absurdres, extremely detailed, ultra detailed, intricate detail, year2025, vibrant colors, clean lineart, comic shading, best shadow, shiny skin, realistic skin texture, detailed facial skin, detailed eyes, detailed body, soft gradient shading, peach skin, subsurface scattering, rim light, depth of field, light particles, nsfw, explicit, uncensored, sex, vaginal, pov, from behind, male pubic hair, indoors, hospital room, hospital curtain, iv stand, night, dim lighting, detailed background, no text
```
캐릭터 1:
```
1girl, long straight black hair, center part, forehead, no bangs, almond-shaped eyes, medium eyes, double eyelids, dark grey eyes, small eye highlights, natural eyelashes, natural straight eyebrows, korean-style eyes with defined double eyelids, full lips, coral glossy lips, blush, troubled eyebrows, heavy breathing, open mouth, sweat, looking back at viewer, 0.8::athlete::, 0.8::toned body::, healthy skin, slim waist, large breasts, round butt, nude, black pubic hair, standing, bent over, against wall, hands on wall, standing sex, doggystyle, sex from behind, penis in pussy, pussy, ass
```
UC:
```
lowres, blurry, worst quality, bad anatomy, bad hands, extra arms, extra fingers, extra legs, child, chibi, old, narrow eyes, half-closed eyes, muscular, abs, streaked hair, brown hair, blonde hair, blue hair, heterochromia, 3d, frame, border, text, watermark, signature, white outline, glowing outline, halo, flat color, sketch, large eyes, round eyes, sparkling eyes, long eyelashes, thick eyelashes, doll eyes, eye bags, dark circles, censored, mosaic censoring, bar censor, male face, deformed penis, extra penis, other people, tears, crying, girl on top, straddling, cowgirl position, kneeling, on all fours, bed, hospital bed, hairy legs, leg hair, arm hair, chest hair, male body hair
```

### ★한소영 병실 후배위 + 커튼 너머 간호사 (3인, 확정, 2026-11-21) — 이미지 `novelai/씬/soyoung_hospital_sex_nurse.png` (이미지 파일 저장 필요)
제3자 시점(pov 아님) → 남자도 캐릭터 2로 등장(뒷모습). 캐릭터별 UC 사용. 위치: AI's Choice 끄고 남자 B3, 소영 C3, 간호사 E2.
- 교훈: 간호사 `peeking through curtain gap, suspicious expression, looking at another` → 훔쳐보는 느낌. `unaware, looking at clipboard, side view` → 이쪽을 안 봄. 최종: `standing behind curtain, facing viewer, talking, neutral expression` + 캐릭터 UC `peeking, suspicious, surprised`. 소영 `looking to the side, nervous` → 간호사 쪽 보며 조마조마. 소영 `muscular`는 캐릭터 1 UC에만(전체 UC에 넣으면 남자 근육도 막힘). 더 숨기려면 `sheer curtain, closed curtain`.
Prompt:
```
masterpiece, best quality, amazing quality, very aesthetic, best illustration, absurdres, incredibly absurdres, extremely detailed, ultra detailed, intricate detail, year2025, vibrant colors, clean lineart, comic shading, best shadow, shiny skin, realistic skin texture, detailed facial skin, detailed eyes, detailed body, soft gradient shading, peach skin, subsurface scattering, rim light, depth of field, light particles, nsfw, explicit, uncensored, 2girls, 1boy, sex, vaginal, standing sex, doggystyle, sex from behind, indoors, hospital room, hospital curtain, partially open curtain, iv stand, night, dim lighting, detailed background, cowboy shot, no text
```
캐릭터 1 (소영):
```
1girl, long straight black hair, center part, forehead, no bangs, almond-shaped eyes, medium eyes, double eyelids, dark grey eyes, korean-style eyes with defined double eyelids, full lips, coral glossy lips, blush, troubled eyebrows, heavy breathing, open mouth, sweat, looking to the side, nervous, 0.8::athlete::, 0.8::toned body::, healthy skin, slim waist, large breasts, round butt, nude, standing, bent over, sex from behind, back view, from side
```
캐릭터 1 UC: `muscular, abs, streaked hair, brown hair, blonde hair, large eyes, round eyes, doll eyes, tears, crying, clothes`

캐릭터 2 (남자):
```
1boy, short brown hair, nude, back view, toned back, standing, hands on another's hips, thrusting, face turned away
```
캐릭터 2 UC: `face, looking at viewer, hairy, body hair, chest hair, leg hair, arm hair, clothes`

캐릭터 3 (간호사):
```
1girl, nurse, white nurse uniform, short sleeves, black hair, low ponytail, standing behind curtain, on the other side of the curtain, in background, facing viewer, talking, neutral expression, holding clipboard
```
캐릭터 3 UC: `nude, nipples, cleavage, smile, peeking, suspicious, surprised, blush, side view, back view, looking down`

### ★한소영 병실 바닥 후배위 질내사정 (삽입 유지, 확정, 2026-11-21) — 이미지 `novelai/씬/soyoung_hospital_floor_creampie.png` (이미지 파일 저장 필요)
간호사 컷 다음. 원래 "천 물고 후배위" 시도 → 실패 후 이 장면으로 대체.
- 실패 교훈 (천 물기 후배위): `from below` + 정면 얼굴 = 무조건 기승위로 끌려감(학습 데이터 편향). `clothes in mouth` → 입은 셔츠를 들어올려 묾 → 따로 된 천은 `rolled-up towel in mouth`/`long cloth in mouth` + UC `shirt, shirt lift`. `reins, cloth pulled back, arched back, upper body raised` 겹치면 머리가 뒤로 꺾여 거꾸로 쳐다봄. 이 구도는 NovelAI로 어려움 → 필요하면 ComfyUI Qwen edit.
- 이 씬 교훈: `after sex` → 자지 빠진 상태로 감 → `creampie, cum overflow` + `penis in pussy` + UC `penis out, pulling out`. `face down, top-down bottom-up` → 팔 사라짐 → `hands on floor, arms supporting body` + UC `missing arms, no arms, arms under body`. 더 지친 느낌은 `on elbows`.
Prompt:
```
masterpiece, best quality, amazing quality, very aesthetic, best illustration, absurdres, incredibly absurdres, extremely detailed, ultra detailed, intricate detail, year2025, vibrant colors, clean lineart, comic shading, best shadow, shiny skin, realistic skin texture, detailed facial skin, detailed eyes, detailed body, soft gradient shading, peach skin, subsurface scattering, rim light, depth of field, light particles, nsfw, explicit, uncensored, sex, vaginal, creampie, pov, from behind, male pubic hair, indoors, hospital room, on floor, hospital curtain, iv stand, night, dim lighting, detailed background, no text
```
캐릭터 1:
```
1girl, long straight black hair, center part, messy hair, almond-shaped eyes, medium eyes, double eyelids, dark grey eyes, small eye highlights, natural eyelashes, natural straight eyebrows, korean-style eyes with defined double eyelids, full lips, coral glossy lips, blush, troubled eyebrows, heavy breathing, open mouth, sweat, exhausted, looking back at viewer, 0.8::athlete::, 0.8::toned body::, healthy skin, slim waist, large breasts, round butt, completely nude, on floor, hands on floor, arms supporting body, ass up, doggystyle, sex from behind, penis in pussy, cum in pussy, cum overflow, pussy, ass
```
UC:
```
lowres, blurry, worst quality, bad anatomy, bad hands, extra arms, extra fingers, extra legs, missing arms, no arms, arms behind back, arms under body, child, chibi, old, narrow eyes, muscular, abs, streaked hair, brown hair, blonde hair, blue hair, heterochromia, 3d, frame, border, text, watermark, signature, white outline, glowing outline, halo, flat color, sketch, large eyes, round eyes, sparkling eyes, long eyelashes, thick eyelashes, doll eyes, eye bags, dark circles, censored, mosaic censoring, bar censor, male face, deformed penis, extra penis, penis out, pulling out, other people, tears, crying, bed, hospital bed, girl on top, straddling, cowgirl position, hairy legs, leg hair, male body hair
```

### ★한소영 병실 아침 역기승위 (여러 번 후, 확정, 2026-11-21) — 이미지 `novelai/씬/soyoung_hospital_morning_reverse_cowgirl.png` (이미지 파일 저장 필요)
바닥 질내사정 다음 컷. 밤새 여러 번 → 아침 해 뜸. 뒷모습 역기승위, 어깨 너머 돌아봄, 남자 pov.
- 교훈: `cum on back, cum on ass` → 등에 한 줄기로 크게 흘러내림 → `small amount of cum, dried cum` + 부위별(`cum on face, cum on lips, cum on ass`) + UC `excessive cum, cum string, cum pool, bukkake`. 남자 음모는 매번 Prompt에 `male pubic hair` 명시(빠지면 사라짐, 그래도 사라지면 1.2 가중치).
Prompt:
```
masterpiece, best quality, amazing quality, very aesthetic, best illustration, absurdres, incredibly absurdres, extremely detailed, ultra detailed, intricate detail, year2025, vibrant colors, clean lineart, comic shading, best shadow, shiny skin, realistic skin texture, detailed facial skin, detailed eyes, detailed body, soft gradient shading, peach skin, subsurface scattering, rim light, depth of field, light particles, nsfw, explicit, uncensored, sex, vaginal, pov, from below, from behind, back view, male pubic hair, indoors, hospital room, white bed sheet, morning, sunrise, warm sunlight through window, window blinds, detailed background, no text
```
캐릭터 1:
```
1girl, long straight black hair, center part, messy hair, almond-shaped eyes, medium eyes, double eyelids, dark grey eyes, small eye highlights, natural eyelashes, natural straight eyebrows, korean-style eyes with defined double eyelids, full lips, coral glossy lips, blush, troubled eyebrows, heavy breathing, open mouth, sweat, exhausted, looking back at viewer, 0.8::athlete::, 0.8::toned body::, healthy skin, slim waist, large breasts, round butt, completely nude, small amount of cum, dried cum, cum on face, cum on lips, cum on ass, reverse cowgirl position, straddling, girl on top, facing away, penis in pussy, ass
```
UC:
```
lowres, blurry, worst quality, bad anatomy, bad hands, extra arms, extra fingers, extra legs, missing arms, child, chibi, old, narrow eyes, muscular, abs, streaked hair, brown hair, blonde hair, blue hair, heterochromia, 3d, frame, border, text, watermark, signature, white outline, glowing outline, halo, flat color, sketch, large eyes, round eyes, sparkling eyes, long eyelashes, thick eyelashes, doll eyes, eye bags, dark circles, censored, mosaic censoring, bar censor, male face, deformed penis, extra penis, other people, tears, crying, night, dark, hospital bed frame, doggystyle, all fours, excessive cum, cum string, cum pool, bukkake, hairy legs, leg hair, male body hair
```

UC (전체):
```
lowres, blurry, worst quality, bad anatomy, bad hands, extra arms, extra fingers, extra legs, child, chibi, old, heterochromia, 3d, frame, border, text, watermark, signature, white outline, glowing outline, halo, flat color, sketch, eye bags, dark circles, censored, mosaic censoring, bar censor, deformed penis, extra penis, extra person, kneeling, on all fours, bed, hospital bed, girl on top
```

모델: V5 (Full 권장, 성인 장면은 Full 필수) / 바탕 이미지 없음
★크기 (2026-11-21): 가로 게임 CG = **1344×768** (16:9에 가장 가까운 64배수, Opus 무료 확인됨 — Anlas 0). 생성 후 위아래 몇 px만 잘라 16:9. 스탠딩 = 832×1216. 3:2(1216×832)로 뽑고 잘라내면 구도가 깨지니 쓰지 말 것.
  - 세로 768×1344(9:16)도 무료. 1인 캐릭터 컷은 세로가 더 예쁨(사용자, 2026-11-21) → 게임에선 좌우 블러 배경/패닝으로 띄우는 1인 이벤트 CG용. 여러 명·배경 중요한 장면만 1344×768.
  - 미소는 `round butt` 때문에 몸 돌린 뒷태(뒤돌아보기)로 자주 감 → **이게 더 예쁨(사용자 선호)**. 정면 `facing viewer` + `upper body`로 막으면 밋밋한 증명사진이 됨(2026-11-21 실패). 1인 컷은 세로 + 뒤돌아보는 엉덩이 쪽 구도 유지.
  - 16:9 구도 주의: 화면이 넓어 캐릭터가 작아지고 바닥·빈 공간이 커짐. `wide shot` 금지. 1인 컷은 `cowboy shot` 또는 `upper body`로 더 당기고, 캐릭터 위치 격자로 좌/우 1/3(B3·D3)에 두기. 남는 쪽은 의미 있는 배경(창·소품)이나 전경 소품으로 채우기. 대사창이 아래에 오니 얼굴은 위쪽 1/3에.
[ ] 칸만 장면마다 교체. 화풍·질감 태그는 고정.

---

## B+. ★현재 기본★ (B + 테스트 3장에서 효과 본 태그, 2026-11-20 확정, Opus 결제)
Vibe Transfer 참고 컷: C:\Users\orang\Downloads\novelai_vibe\ (효과음 제거본)
B의 화풍 태그 뒤에 아래 두 묶음 추가:
- 피부(거실 테스트): `soft gradient shading, peach skin, subsurface scattering`
- 연출(무대 테스트): `rim light, depth of field, light particles`
- 물기(수영장 테스트)는 기본에서 제외. 물 장면에서만 `wet skin` 하나만.

```
masterpiece, best quality, amazing quality, very aesthetic, best illustration, absurdres, incredibly absurdres, extremely detailed, ultra detailed, intricate detail, year2025, vibrant colors, clean lineart, comic shading, best shadow, shiny skin, realistic skin texture, detailed facial skin, detailed eyes, detailed body, soft gradient shading, peach skin, subsurface scattering, rim light, depth of field, light particles, [장면], detailed background, [구도], no text
```

### ★진미소 캐릭터 1 확정 (V5 Full, B+와 함께, Vibe 없음) — "미소 같네"
```
1girl, k-pop idol, long straight dark brown hair, waist-length hair, face-framing strands, almond-shaped eyes, medium eyes, double eyelids, dark grey eyes, small eye highlights, natural eyelashes, natural straight eyebrows, korean-style eyes with defined double eyelids, full lips, coral glossy lips, playful smile, open mouth, slim waist, slim stomach, large breasts, round butt, long legs, [의상], [포즈]
```
(연습실 의상/포즈: white cropped t-shirt, pink dolphin shorts, midriff, looking back, hand on hair)
- 소재 태그는 기본 프롬프트에 넣지 말고 의상 칸에 그 옷 앞에만. 과하게 넣지 말 것 (vivid pink → 형광, cotton+matte → 물 빠진 연분홍, glossy/satin → 가죽).
- 기본 프롬프트 질감부: `1.2::detailed fabric::, fabric texture, fabric wrinkles, cloth folds` (glossy fabric 금지)
- UC 추가분: `latex, leather, shiny clothes, glossy clothes, plastic clothes, thin eyebrows` (thick eyebrows는 UC에서 제거)

### ★기본 Undesired Content (V5, UC 프리셋 Human Focus)
```
lowres, blurry, worst quality, bad anatomy, bad hands, extra arms, extra fingers, extra legs, child, chibi, old, narrow eyes, half-closed eyes, muscular, abs, streaked hair, blonde hair, heterochromia, 3d, frame, border, text, watermark, signature, white outline, glowing outline, halo, flat color, sketch, large eyes, round eyes, sparkling eyes, long eyelashes, thick eyelashes, doll eyes, eye bags, dark circles
```
(눈썹은 UC에서 thin/thick 둘 다 막지 않음 — 막는 쪽 반대로 쏠림. 두꺼우면 `0.5::thick eyebrows::`)

### ★진미소 최종 확정 이미지: `novelai/캐릭터/진미소/miso_design.png` (2026-11-20, V5 Full)

### 진미소 마사지 해달라는 장면 (확정) — 이미지 `novelai/씬/EP1_P3_massage_sofa.png`
Prompt = B+ + `ecchi, indoors, living room, sofa`
캐릭터 1:
```
1girl, k-pop idol, long straight dark brown hair, waist-length hair, face-framing strands, almond-shaped eyes, medium eyes, double eyelids, dark grey eyes, small eye highlights, natural eyelashes, natural straight eyebrows, korean-style eyes with defined double eyelids, full lips, coral glossy lips, playful smile, open mouth, slim waist, slim stomach, large breasts, round butt, long legs, white cropped t-shirt, underboob, pink dolphin shorts, lying on sofa, barefoot, foot raised toward viewer, feet visible, asking for a massage
```
UC = 미소 기본 UC + `other people, socks, shoes, cropped feet, bad feet, extra toes`

### 진미소 사무실 버전 — 이미지 `novelai/캐릭터/진미소/miso_office.png`
규칙: 확정 미소 프롬프트는 그대로, [장면]/[의상]/[포즈]만 교체. (k-pop idol 등 기본 태그 지우면 얼굴 달라짐)
- [장면]: `indoors, office, night, desk, computer monitor, city lights through window, desk lamp on desk`
- [의상+포즈]: `black-framed glasses, white blouse, unbuttoned blouse, black lace bra peeking, black pencil skirt, black pantyhose, black panties under pantyhose, high heels, sitting on desk edge, crossed legs, hand adjusting glasses`
- UC 추가: `grey skirt, office chair, other people, tan pantyhose, beige legwear, brown legwear, latex, leather, shiny clothes`
- 주의: `sheer` 넣으면 스타킹이 살색 됨

### 진미소 아이돌 무대 v2 (확정) — 이미지 `novelai/캐릭터/진미소/miso_stage_v2.png`
아래 무대 버전과 같은 프롬프트(백댄서 없음). 시드만 다름.

### 진미소 아이돌 무대 버전 — 이미지 `novelai/캐릭터/진미소/miso_stage.png` (아주 잘 나옴)
- [장면]: `concert stage, purple and pink spotlights, stage lights, crowd silhouettes, lightsticks`
- [의상+포즈]: `black cropped camisole, detached sleeves, black pleated miniskirt, silver belt, heart sticker on cheek, microphone headset, dancing, one arm raised, hair flip`
- UC 추가: `crowd faces, latex, leather, shiny clothes`
- 치마 속 노출 막으려면 의상에 `black shorts under skirt`

---

## ★임신혜(엄마) 확정 — 이미지 `novelai/캐릭터/임신혜/shinhye_design.png` (2026-11-20, V5 Full, B+)
Prompt: B+ + [장면] `indoors, living room, soft indoor lighting, daytime, sofa` / [구도] `cowboy shot, from side`
(노란 저녁 조명 쓰면 머리가 금발처럼 바램)

### 캐릭터 1
```
1girl, medium brown hair, warm brown hair, hair slicked back, low hair bun, loose strands framing face, forehead, no bangs, oval face, almond-shaped eyes, medium eyes, double eyelids, brown eyes, small eye highlights, natural eyelashes, defined straight eyebrows, korean-style eyes with defined double eyelids, full lips, pink glossy lips, gentle smile, looking at viewer, narrow waist, large breasts, wide hips, round butt, curvy, [의상: dark purple halter dress, sleeveless, tight dress, dark purple cardigan hanging off shoulders], [포즈: standing, leaning forward slightly, upper body facing viewer]
```

### Undesired Content
```
lowres, blurry, worst quality, bad anatomy, bad hands, extra arms, extra fingers, extra legs, child, chibi, old, wrinkles, narrow eyes, half-closed eyes, muscular, abs, black hair, blonde hair, bangs, blunt bangs, heterochromia, 3d, frame, border, text, watermark, signature, white outline, glowing outline, halo, flat color, sketch, large eyes, round eyes, sparkling eyes, long eyelashes, thick eyelashes, doll eyes, eye bags, dark circles, latex, leather, shiny clothes, light brown hair, ash blonde hair, pale hair, huge breasts, gigantic breasts, oily skin
```
- 교훈: `huge breasts` 과함 → `large breasts`. 옷+포즈 동작을 한꺼번에 많이 넣으면 엉킴.

### 임신혜 EP1 부축 씬 (확정) — 이미지 `novelai/씬/EP1_P2_support_home.png`
차량씬은 실패(차 내부 구조 생성 어려움) → 현관 부축 씬으로 대체. 남자는 캐릭터 2로 팔·어깨만.
- 신혜 머리(이 씬부터): `center part, soft voluminous hair, side-swept hair over temples, low bun at nape, loose strands framing face` (slicked back 쓰면 너무 깐머리)
- 성숙미: `mature female, sensual, voluptuous` 가중치 없이 1번씩, 가슴 `1.2::large breasts::`

Prompt:
```
masterpiece, best quality, amazing quality, very aesthetic, best illustration, absurdres, incredibly absurdres, extremely detailed, ultra detailed, intricate detail, year2025, vibrant colors, clean lineart, comic shading, best shadow, shiny skin, realistic skin texture, detailed facial skin, detailed eyes, detailed body, soft gradient shading, peach skin, subsurface scattering, rim light, depth of field, light particles, ecchi, night, luxury penthouse entrance, high-rise apartment, marble floor, dark wood wall panels, gold accents, indirect ceiling lighting, floor-to-ceiling window, night city skyline, a drunk woman leans heavily on a man who is helping her walk, she hangs on his arm with her breasts pressed against it, the man is cut off by the edge of the frame and only his shoulder and arm are visible, focus on the woman, cowboy shot, no text
```
캐릭터 1:
```
1girl, medium brown hair, warm brown hair, center part, soft voluminous hair, side-swept hair over temples, low bun at nape, loose strands framing face, almond-shaped eyes, medium eyes, double eyelids, brown eyes, small eye highlights, natural eyelashes, defined straight eyebrows, korean-style eyes with defined double eyelids, full lips, pink glossy lips, drunk, sleepy eyes, blush, gentle smile, parted lips, mature female, sensual, voluptuous, narrow waist, 1.2::large breasts::, wide hips, black suit jacket, no blouse, red lace bra peeking, cleavage, black pencil skirt, tight skirt, black high heels, hugging arm, leaning on man, breast press, breasts against arm
```
캐릭터 2:
```
1boy, out of frame, head out of frame, only arm and shoulder visible, purple sweatshirt sleeve
```
UC:
```
lowres, blurry, worst quality, bad anatomy, bad hands, extra arms, extra fingers, extra legs, child, chibi, old, wrinkles, narrow eyes, muscular, abs, black hair, blonde hair, red hair, bangs, blunt bangs, heterochromia, 3d, frame, border, text, watermark, signature, white outline, glowing outline, halo, flat color, sketch, large eyes, round eyes, sparkling eyes, long eyelashes, thick eyelashes, doll eyes, eye bags, dark circles, latex, leather clothes, shiny clothes, huge breasts, nipples, high bun, slicked back hair, white blouse, male face, male head, faceless, extra person, groping, cheap apartment, motel, hallway, plain wall, wooden door, tile floor
```
- 교훈: `faceless` 넣으면 눈코입 없는 얼굴이 그려짐 → 남자는 `head out of frame` + 프레임 밖 설명. 고급 배경은 건물명 대신 대리석/원목/금색/간접조명/통유리 야경 + UC로 싸구려 배경 차단.

### 임신혜 시상식 레드카펫 v2 (변경된 머리/성숙미 버전, 사용 확정) — 이미지 `novelai/씬/EP1_P2_red_carpet_v2.png`
캐릭터 1 = 부축 씬 머리/성숙미 태그 + 레드카펫 의상·포즈, 표정 `gentle smile, looking at viewer`. UC에서 drunk용 제외분 원복(`half-closed eyes` 다시 막음).

### 임신혜 시상식 레드카펫 (구버전) — 이미지 `novelai/씬/EP1_P2_red_carpet.png` (일관성 OK)
- [장면]: `award ceremony, red carpet, night, camera flashes, lens flare sparkles, blurry photographers in background, bokeh` / [구도] `cowboy shot, from side`
- [의상+포즈]: `white strapless dress, tight dress, side slit, cleavage, black cropped jacket draped over shoulders, gold necklace, gold drop earrings, standing on red carpet, turning toward viewer, one hand raised waving`
- UC 추가: `crowd faces, extra person, holding hands` (원작처럼 팔 잡으면 사람이 하나 더 생김)

### 임신혜 서재 란제리 (조금 야한 씬) — 이미지 `novelai/씬/shinhye_study_lingerie.png`
- [장면]: `nsfw, ecchi, indoors, study room, night, desk, laptop screen glow, dim cool lighting` / [구도] `cowboy shot, from above`
- 표정은 기본 `gentle smile` 대신: `shy expression, blush, parted lips`
- [의상+포즈]: `black lace bra, black lace panties, sheer black robe, see-through robe, robe slipping off shoulders, cleavage, sitting on desk, leaning forward, hands on desk`
- UC 추가: `other people, nipples, pussy` (노출 올리려면 nipples, pussy 제거)

### ★임신혜 침대에서 잠든 속옷 노출 (확정, ecchi, 2026-11-21) — 이미지 `novelai/씬/shinhye_sleeping_bed.png` (이미지 파일 저장 필요)
웹툰 레퍼런스(차 뒷좌석에서 잠든 정장+빨간 레이스 속옷)를 침대로 옮김. 차 내부는 생성 실패 기록 있어서 제외. 머리·성숙미 = 부축 씬 버전.
Prompt:
```
masterpiece, best quality, amazing quality, very aesthetic, best illustration, absurdres, incredibly absurdres, extremely detailed, ultra detailed, intricate detail, year2025, vibrant colors, clean lineart, comic shading, best shadow, shiny skin, realistic skin texture, detailed facial skin, detailed eyes, detailed body, soft gradient shading, peach skin, subsurface scattering, rim light, depth of field, light particles, ecchi, indoors, luxury bedroom, night, dim warm lighting, bed, grey bed sheets, pillow, detailed background, from below, cowboy shot, no text
```
캐릭터 1:
```
1girl, medium brown hair, warm brown hair, center part, soft voluminous hair, side-swept hair over temples, low bun at nape, loose strands framing face, oval face, korean-style eyes with defined double eyelids, natural straight eyebrows, full lips, pink glossy lips, sleeping, closed eyes, parted lips, blush, mature female, sensual, voluptuous, narrow waist, 1.2::large breasts::, wide hips, thick thighs, black suit jacket, gold buttons, jacket partially unbuttoned, red lace bra, cleavage, black pencil skirt, skirt lift, red lace panties, lying on bed, on back, head on pillow, hand on chest, legs apart
```
UC:
```
lowres, blurry, worst quality, bad anatomy, bad hands, extra arms, extra fingers, extra legs, child, chibi, old, wrinkles, muscular, abs, black hair, blonde hair, red hair, bangs, blunt bangs, heterochromia, 3d, frame, border, text, watermark, signature, white outline, glowing outline, halo, flat color, sketch, open eyes, looking at viewer, large eyes, doll eyes, eye bags, dark circles, latex, leather clothes, shiny clothes, huge breasts, nipples, pussy, high bun, slicked back hair, white blouse, other people, 1boy, male, extra person, groping, sofa, car interior, censored
```
- 노출 올리기: 의상에 `bra pulled down` + UC에서 `nipples` 제거. 팬티 안 보이면 시드 재시도 → 그래도 안 되면 `panty shot` 하나만.

### 임신혜 밤 침대에 나란히 앉음 (주인공 pov, 저장만 — 확정 이미지 아직 없음, 2026-11-21) — 1344×768, 위치 D3
웹툰 레퍼런스: 밤 침실, 검은 레이스 슬립 + 비치는 검은 가운, 침대에 앉아 옆의 주인공을 부끄럽게 올려다봄.
- 교훈: 주인공을 캐릭터 2(무릎·손만)로 넣으면 배경에 따로 서 있는 사람이 됨 → `pov` + 신혜 `looking at viewer`면 카메라를 주인공으로 착각. 어깨너머 구도도 시도했으나 결국 **신혜만 + pov**로 정리(신혜가 카메라 보는 것 = 주인공 보는 것). 같은 침대 느낌은 `sitting close to viewer` + `from side`.
- 겉옷: `mesh`는 그물망(구멍 뚫린 천)이 됨 → 원하는 건 시스루 `sheer black chiffon robe, see-through, see-through sleeves, translucent fabric` + UC `mesh, fishnet, lace trim robe, opaque robe`. 안 비치면 `1.2::see-through::`.
- 노란 조명 금지(머리 금발처럼 바램) → 보랏빛 달빛.
Prompt:
```
masterpiece, best quality, amazing quality, very aesthetic, best illustration, absurdres, incredibly absurdres, extremely detailed, ultra detailed, intricate detail, year2025, vibrant colors, clean lineart, comic shading, best shadow, shiny skin, realistic skin texture, detailed facial skin, detailed eyes, detailed body, soft gradient shading, peach skin, subsurface scattering, rim light, depth of field, light particles, ecchi, indoors, bedroom, night, dim lighting, purple moonlight, sitting on bed, pov, from side, detailed background, eye level, cowboy shot, no text
```
캐릭터 1:
```
1girl, medium brown hair, warm brown hair, center part, soft voluminous hair, side-swept hair over temples, low bun at nape, loose strands framing face, almond-shaped eyes, medium eyes, double eyelids, brown eyes, small eye highlights, natural eyelashes, defined straight eyebrows, korean-style eyes with defined double eyelids, full lips, pink glossy lips, blush, troubled eyebrows, shy, parted lips, looking at viewer, mature female, sensual, voluptuous, narrow waist, 1.25::large breasts::, wide hips, black lace camisole, cleavage, sheer black chiffon robe, see-through, see-through sleeves, translucent fabric, sitting on bed, sitting close to viewer, hands on own knees, body turned toward viewer
```
UC:
```
lowres, blurry, worst quality, bad anatomy, bad hands, extra arms, extra fingers, extra legs, child, chibi, old, wrinkles, narrow eyes, half-closed eyes, muscular, abs, black hair, blonde hair, light brown hair, red hair, bangs, blunt bangs, high bun, slicked back hair, heterochromia, 3d, frame, border, text, watermark, signature, white outline, glowing outline, halo, flat color, sketch, large eyes, round eyes, sparkling eyes, long eyelashes, thick eyelashes, doll eyes, eye bags, dark circles, latex, leather, shiny clothes, gigantic breasts, mesh, fishnet, lace trim robe, opaque robe, nipples, other people, 1boy, male, yellow lighting, nsfw
```

### ★임신혜 거실에서 나에게 다가옴 (확정, ecchi, 2026-11-21) — 이미지 `novelai/씬/shinhye_approach_living_room.png` (이미지 파일 저장 필요)
웹툰 레퍼런스(자줏빛 홀터 미니 원피스, 맨발, 다가와서 키스) — 다가오는 pov 컷. 의상 = 신혜 확정 `dark purple halter dress`.
- 교훈: 홀터+자줏빛만 보고 `naked apron`으로 오해 → 레퍼런스 전신 확인. `from above`+`upper body` → 이상한 사선 앵글. `reaching toward viewer` → 셀카처럼 두 팔 쭉 뻗음 → `hand on own chest`. `looking up at viewer` → 탑뷰(키차이 과함) → `looking at viewer` + `eye level` + UC `from above, high angle, looking up`. 펜트하우스 통유리 야경은 과함 → 평범한 거실. 현관 배경은 문이 너무 강조됨 → UC `door, front door, entrance, hallway`.
- 키스로 이어가기: `arms around viewer's neck, incoming kiss`.
Prompt:
```
masterpiece, best quality, amazing quality, very aesthetic, best illustration, absurdres, incredibly absurdres, extremely detailed, ultra detailed, intricate detail, year2025, vibrant colors, clean lineart, comic shading, best shadow, shiny skin, realistic skin texture, detailed facial skin, detailed eyes, detailed body, soft gradient shading, peach skin, subsurface scattering, rim light, depth of field, light particles, ecchi, pov, eye level, indoors, living room, sofa, soft indoor lighting, evening, detailed background, cowboy shot, no text
```
캐릭터 1:
```
1girl, medium brown hair, warm brown hair, center part, soft voluminous hair, side-swept hair over temples, low bun at nape, loose strands framing face, almond-shaped eyes, medium eyes, double eyelids, brown eyes, small eye highlights, natural eyelashes, defined straight eyebrows, korean-style eyes with defined double eyelids, full lips, pink glossy lips, blush, troubled eyebrows, parted lips, looking at viewer, mature female, sensual, voluptuous, narrow waist, 1.2::large breasts::, wide hips, dark purple halter dress, sleeveless, tight dress, short dress, cleavage, barefoot, walking toward viewer, hand on own chest
```
UC:
```
lowres, blurry, worst quality, bad anatomy, bad hands, extra arms, extra fingers, extra legs, child, chibi, old, wrinkles, narrow eyes, half-closed eyes, muscular, abs, black hair, blonde hair, light brown hair, red hair, bangs, blunt bangs, heterochromia, 3d, frame, border, text, watermark, signature, white outline, glowing outline, halo, flat color, sketch, large eyes, round eyes, sparkling eyes, long eyelashes, thick eyelashes, doll eyes, eye bags, dark circles, latex, leather clothes, shiny clothes, huge breasts, nipples, high bun, slicked back hair, other people, male face, apron, naked apron, kitchen, from above, high angle, looking up, dutch angle, from side, door, front door, entrance, hallway, selfie, outstretched arms, reaching, city skyline, night view
```

---

## ◆별도 스타일: 그래픽 노블(하데스 게임 태그) — 새가족과 별개 테스트 (2026-11-20, "스타일 나쁘지 않네")
배경 없는 세로 스탠딩(832×1216). 흐름: 실크스크린풍(너무 만화) → 미소녀(원본 화풍 사라짐) → 흑백(채색 안 됨) → B+ 렌더링 섞기 → `hades (game)` 게임 태그로 정착. `artist:jen zee` 단독은 잘 안 먹힘. 페르소나(`persona 5`, `artist:soejima shigenori`)도 시도했으나 이 버전이 더 나음.
### Prompt (스타일 공통)
```
1.2::hades (game)::, 0.8::artist:jen zee::, masterpiece, best quality, amazing quality, very aesthetic, absurdres, year2025, full color, graphic novel style, thick lineart, bold black outlines, heavy black shadows, ink shading, hatching, angular shapes, sharp silhouette, high contrast, saturated colors, vivid complementary colors, glowing rim light, dramatic lighting, painterly texture, red accents, detailed clothes, detailed hair, character design, full body, standing, centered, white background, no background, no text
```
### 캐릭터: 안경 신사 (남, 일본도)
```
1boy, gentleman, brown hair, short hair, messy wavy hair, curly hair, hair swept up, black-framed glasses, rectangular glasses, blue eyes, kind eyes, friendly smile, broad shoulders, navy blue blazer, gold buttons, open blazer, white dress shirt, open collar, wide red necktie, loose necktie, black belt, navy blue pants, brown loafers, single katana on back, brown leather sword strap across chest, hand in pocket
```
UC:
```
lowres, blurry, worst quality, bad anatomy, bad hands, extra fingers, 3d, realistic, photo, monochrome, greyscale, uncolored, lineart only, soft shading, gradient shading, blush, moe, chibi, simplified, vector art, pastel colors, laurel crown, greek clothes, toga, chiton, fire, flames, 1girl, female, scenery, floor, shadow on ground, cropped, text, watermark, signature, grin, evil smile, creepy, crazy eyes, shadow on face, neon colors, chromatic aberration, round glasses, long hair, medium hair, slicked back hair, double-breasted, badge, emblem, multiple swords
```
- 교훈: `wide smile`+하데스 그림자 → 광기 얼굴. `neat, side part` → 짧은 포마드. 웃음은 `friendly smile` + UC `grin, shadow on face`.
### 캐릭터: 후드 재킷 소녀 (빨간 브릿지)
```
1girl, long black hair, messy hair, red streaks in hair, sharp eyes, sullen expression, bored, black eyes, white collared shirt, red bow tie, oversized olive green hooded jacket, open jacket, black pleated skirt, black knee socks, white sneakers, black backpack, plush ghost keychain on backpack, hand on backpack strap, holding smartphone
```
UC = 위 UC에서 `1girl, female` 대신 `1boy`, 남캐용 항목 제외 + `large eyes, sparkling eyes, dark circles, half-closed eyes, weapon`

### ★펑키 고채도 버전 (스타일 공통, 2026-11-20 사용자 저장 요청)
위 하데스 스타일 + 대비·조명 강화 + 채도/팝 컬러 + 마젠타·시안 역광. 한국 캐릭터는 `korean, fair skin` 넣어 서양 코믹스화 방지.
```
1.2::hades (game)::, 0.8::artist:jen zee::, masterpiece, best quality, amazing quality, very aesthetic, absurdres, year2025, full color, graphic novel style, thick lineart, bold black outlines, heavy black shadows, ink shading, hatching, angular shapes, sharp silhouette, 1.3::high contrast::, chiaroscuro, 1.3::saturated colors::, vibrant colors, colorful, pop art colors, bold color palette, vivid complementary colors, 1.2::magenta and cyan rim light::, 1.2::dramatic lighting::, harsh lighting, bright highlights, specular highlights, painterly texture, detailed clothes, detailed hair, character design, full body, standing, centered, white background, no background, no text
```
선하 버전 캐릭터 1:
```
1girl, korean, black hair, high ponytail, see-through bangs, dark brown eyes, expressionless, looking at viewer, fair skin, slim, korean school uniform, white collared shirt, red necktie, black v-neck knit vest with white trim, grey pencil skirt, black knee socks, black loafers, black backpack, green frog plush keychain hanging from backpack zipper, holding backpack strap, relaxed posture
```
선하 버전 UC:
```
lowres, blurry, worst quality, bad anatomy, bad hands, extra fingers, 3d, realistic, photo, monochrome, greyscale, uncolored, lineart only, soft shading, gradient shading, moe, chibi, simplified, vector art, pastel colors, laurel crown, greek clothes, toga, chiton, fire, flames, 1boy, male, scenery, floor, shadow on ground, cropped, text, watermark, signature, grin, evil smile, creepy, crazy eyes, chromatic aberration, glitch, iridescent, brown hair, blonde hair, short hair, tan, dark skin, nsfw, cleavage, curvy, wide hips, large breasts, makeup, weapon, flat lighting, low contrast, dull colors, washed out, japanese school uniform, sailor uniform, looking down, sad, head down
```
- 조명색 과하면 `1.0`, 색 조합 변경: `orange and teal` / `red and blue`. 한국형 눈 태그 넣으면 하데스 느낌 약해짐(하데스 1.0 + 눈 태그 = 루시 버전, 원작 캐릭터 느낌 우선일 때).
- 바이킹·중세 여자 캐릭터 프롬프트는 이 대화 기록 참고(대비 강화판 = 위에서 채도/역광 색만 뺀 것).

---

## 김선하 (선후 친여동생, 고등학생 — 일상 CG만, 성적·선정적 장면 절대 없음) — 이미지 `novelai/캐릭터/김선하/seonha_design.png` (임시 저장, 2026-11-20)
학교에서 일진에게 왕따 당하는 주변 인물. 실존 인물 사진은 분위기만 참고(얼굴 오리지널).
- 교훈: `korean high school student`·`school uniform`류 태그가 그림체를 평범한 애니로 끌어내림 → `korean school uniform` + 교복 디테일만. 벚꽃·골목은 일본풍. `dynamic angle`·`short`는 위에서 내려다보는 앵글을 만듦 → `eye level` + UC `from above, high angle`. `h-line skirt`는 이상하게 나옴 → `grey pencil skirt`. 키링은 `green frog plush keychain hanging from backpack zipper`.
Prompt = B+ + `outdoors, korean street, morning, backlighting, sunlight, wind, detailed background, full body, eye level`
캐릭터 1:
```
1girl, black hair, high ponytail, ponytail blowing in the wind, see-through bangs, almond-shaped eyes, medium eyes, double eyelids, dark brown eyes, korean-style eyes with defined double eyelids, natural straight eyebrows, quiet expression, looking ahead, slim, korean school uniform, white collared shirt, red necktie, black v-neck knit vest with white trim, grey pencil skirt, black backpack, green frog plush keychain hanging from backpack zipper, walking, mid-stride
```
UC:
```
lowres, blurry, worst quality, bad anatomy, bad hands, extra arms, extra fingers, extra legs, chibi, old, 3d, realistic, photo, frame, border, text, watermark, signature, nsfw, japanese school uniform, sailor uniform, pleated skirt, long skirt, large eyes, round eyes, doll eyes, shoulder bag, tote bag, standing still, portrait, looking at viewer, simple background, keychain in hand, bear keychain, from above, high angle
```

---

## ★미요시(신규, 일본 유학 때 만나는 음대 친구) 확정 — 이미지 `novelai/캐릭터/미요시/miyoshi_design.png`, `novelai/캐릭터/미요시/miyoshi_design_v2.png` (2026-11-20)
콘셉트: 가운데 가르마 뒤로 넘겨 낮게 묶은 머리, 도톰한 입술, 맑은 피부, 장신 슬렌더, 가슴 중간, 성숙·세련. 장신구 없음. 실존 인물 사진은 머리·의상 분위기만 참고(얼굴 오리지널).
- 실패 교훈: `1.2::thick lips::`는 과함, 피부 톤 안 정하면 그을린 이국적 느낌 → `fair skin`. 첼로 연주는 어려움. 그냥 서 있기만 하면 증명사진 → 걷기+돌아보기+바람.
Prompt = B+ + `outdoors, tokyo street, autumn, falling leaves, wind, daytime, sunlight, dynamic angle`
### 캐릭터 1
```
1girl, japanese, mature female, elegant, sophisticated, black hair, center part, slicked back hair, tight low bun, loose strands blowing in the wind, forehead, oval face, defined cheekbones, sharp jawline, almond-shaped eyes, medium eyes, double eyelids, dark brown eyes, small eye highlights, eyeliner, natural eyelashes, natural straight eyebrows, full lips, coral glossy lips, fair skin, faint smile, calm gaze, tall, slender, long legs, slim waist, medium breasts, [의상: black turtleneck sweater, long beige trench coat, coat flowing in the wind, black wide slacks], [동작: walking, hands in coat pockets, looking back over shoulder]
```
### Undesired Content
```
lowres, blurry, worst quality, bad anatomy, bad hands, extra arms, extra fingers, extra legs, child, chibi, old, wrinkles, narrow eyes, half-closed eyes, muscular, abs, bangs, long loose hair, brown hair, blonde hair, heterochromia, 3d, realistic, photo, frame, border, text, logo, watermark, signature, white outline, glowing outline, halo, flat color, sketch, large eyes, round eyes, sparkling eyes, long eyelashes, thick eyelashes, doll eyes, eye bags, dark circles, other people, earrings, hoop earrings, tan, dark skin, huge breasts, large breasts, flat chest, small breasts, necklace, jewelry, rings, standing still, portrait, round face, baby face
```

---

## ★박신영 / 활동명 루시(LUCY) — SPRING 리더(미소 그룹), 확정 — 이미지 `novelai/캐릭터/루시/lucy_design.png` (2026-11-20)
콘셉트: 큰 키, 건강미, 검은 단발, 섹시·도도, 왼쪽 눈 밑 점, 웃으면 반달 눈웃음. 실존 인물 사진은 머리·의상·체형만 참고(얼굴은 오리지널).
Prompt = B+ + `outdoors, city street, daytime, sunlight, cowboy shot`
### 캐릭터 1
```
1girl, k-pop idol, black hair, short bob cut, chin-length hair, see-through bangs, hair flipped out at ends, almond-shaped eyes, slightly upturned eyes, medium eyes, double eyelids, dark brown eyes, small eye highlights, natural eyelashes, natural straight eyebrows, korean-style eyes with defined double eyelids, mole under left eye, full lips, coral glossy lips, bright smile, smiling eyes, looking at viewer, tall, long legs, 0.8::athlete::, 0.8::toned body::, healthy skin, slim waist, large breasts, wide hips, thick thighs, curvy, [의상: black sleeveless turtleneck crop top, silver pendant necklace, denim mini skirt]
```
### Undesired Content
```
lowres, blurry, worst quality, bad anatomy, bad hands, extra arms, extra fingers, extra legs, child, chibi, old, narrow eyes, half-closed eyes, muscular, abs, long hair, brown hair, blonde hair, heterochromia, 3d, realistic, photo, frame, border, text, watermark, signature, white outline, glowing outline, halo, flat color, sketch, large eyes, round eyes, sparkling eyes, long eyelashes, thick eyelashes, doll eyes, eye bags, dark circles, other people, mole under right eye, closed eyes, skinny, slender, flat chest, small breasts, stage, microphone
```
(무대 장면에선 UC의 `stage, microphone` 제거)

---

## ★윤서아(신규, 의사) 확정 — 이미지 `novelai/캐릭터/윤서아/seoa_standing.png` (2026-11-21, 스탠딩으로 캐릭터 디자인, 이미지 파일 저장 필요)
콘셉트: 의사, 긴 검은 머리(끝만 살짝 웨이브, 옆가르마로 넘긴 이마), 얇은 검은 테 동그란 안경, 눈꼬리 살짝 올라감, 다정한 미소, 장신 슬림 + 가슴 큼. 의상 연보라 스크럽 + 흰 가운. 웹툰 레퍼런스는 분위기만 참고(얼굴 오리지널).
- 교훈: `wavy hair` → 웨이브 과함 → `slightly wavy hair, loose waves at hair ends` + UC `curly hair, very wavy hair` (UC `straight hair`는 반대로 강웨이브를 부름, 제거). 검은 테는 `thin black frame glasses` + UC `metal frame glasses, gold-framed glasses, silver-framed glasses`. 눈꼬리 `slightly upturned eyes`(루시 태그) + UC `downturned eyes, tareme`, 날카로우면 0.8. 청진기·명찰은 UC로 막아둠(넣으려면 `stethoscope around neck`). 헐렁하면 `fitted scrubs`.
Prompt = 스탠딩 공통 + `space above head` (장면 CG는 B+ + [장면]).
### 캐릭터 1
```
1girl, doctor, long black hair, slightly wavy hair, loose waves at hair ends, side part, hair swept back, forehead, almond-shaped eyes, slightly upturned eyes, medium eyes, double eyelids, dark brown eyes, small eye highlights, natural eyelashes, natural straight eyebrows, korean-style eyes with defined double eyelids, round glasses, thin black frame glasses, full lips, coral glossy lips, gentle smile, parted lips, looking at viewer, mature female, tall, slender, slim waist, large breasts, lavender scrubs, scrub top, v-neck, scrub pants, white lab coat, open lab coat, standing, hand adjusting glasses
```
### Undesired Content (스탠딩용 — 장면 CG에선 스탠딩 공통분 `scenery, full body…cut off` 빼고 사용)
```
lowres, blurry, worst quality, bad anatomy, bad hands, extra arms, extra fingers, extra legs, child, chibi, old, wrinkles, narrow eyes, half-closed eyes, muscular, abs, bangs, blunt bangs, curly hair, very wavy hair, short hair, brown hair, blonde hair, streaked hair, heterochromia, 3d, frame, border, text, watermark, signature, white outline, glowing outline, halo, flat color, sketch, watercolor, traditional media, lineart only, pale colors, washed out, large eyes, round eyes, sparkling eyes, long eyelashes, thick eyelashes, doll eyes, eye bags, dark circles, downturned eyes, tareme, sunglasses, thick frame glasses, metal frame glasses, gold-framed glasses, silver-framed glasses, stethoscope, name tag, huge breasts, small breasts, flat chest, other people, scenery, full body, feet, close-up, portrait, upper body, from above, from below, nipples, sweat, wet skin, nsfw, head out of frame, cropped head, arms out of frame, cropped arms, cropped shoulders, cut off
```

### ★윤서아 진료실 CG (확정, 2026-11-21) — 이미지 `novelai/씬/seoa_office.png` (이미지 파일 저장 필요)
- 교훈: 복도 정면 걷기 → 대칭·평평한 형광등이라 재미없음 → "순간"이 있는 장면 + 오후 햇살·블라인드 그림자. 복도 버전 살리려면 `dynamic angle` + `walking, looking back over shoulder, hair blowing`.
Prompt:
```
masterpiece, best quality, amazing quality, very aesthetic, best illustration, absurdres, incredibly absurdres, extremely detailed, ultra detailed, intricate detail, year2025, vibrant colors, clean lineart, comic shading, best shadow, shiny skin, realistic skin texture, detailed facial skin, detailed eyes, detailed body, soft gradient shading, peach skin, subsurface scattering, rim light, depth of field, light particles, indoors, doctor's office, desk, bookshelf, computer monitor, window blinds, afternoon sunlight, blinds shadow, detailed background, pov, slightly from below, cowboy shot, no text
```
캐릭터 1:
```
1girl, doctor, long black hair, slightly wavy hair, loose waves at hair ends, side part, hair swept back, forehead, almond-shaped eyes, slightly upturned eyes, medium eyes, double eyelids, dark brown eyes, small eye highlights, natural eyelashes, natural straight eyebrows, korean-style eyes with defined double eyelids, round glasses, thin black frame glasses, full lips, coral glossy lips, teasing smile, looking at viewer, mature female, tall, slender, slim waist, large breasts, lavender scrubs, scrub top, v-neck, scrub pants, white lab coat, open lab coat, sitting on desk, crossed legs, holding clipboard, pen to lips
```
UC:
```
lowres, blurry, worst quality, bad anatomy, bad hands, extra arms, extra fingers, extra legs, child, chibi, old, wrinkles, narrow eyes, half-closed eyes, muscular, abs, bangs, blunt bangs, curly hair, very wavy hair, short hair, brown hair, blonde hair, streaked hair, heterochromia, 3d, frame, border, text, watermark, signature, white outline, glowing outline, halo, flat color, sketch, large eyes, round eyes, sparkling eyes, long eyelashes, thick eyelashes, doll eyes, eye bags, dark circles, downturned eyes, tareme, sunglasses, thick frame glasses, metal frame glasses, gold-framed glasses, silver-framed glasses, stethoscope, name tag, huge breasts, small breasts, flat chest, other people, crowd, office chair, nipples, nsfw
```

---

## ★시안(신규, 인터넷 BJ) 확정 — 이미지 `novelai/캐릭터/시안/sian_standing.png` (2026-11-22, 스탠딩으로 디자인, 이미지 파일 저장 필요)
프로필: 23살(2026-11-22 27→23 변경, 외형은 성인 그대로), 키 158, 인터넷 BJ — 성인 방송/구독형 성인 콘텐츠 크리에이터(온리팬스류)도 하는 설정 (2026-11-22). 성격: 갸루 느낌, 거친 말투, 담배 피움, 말장난·농담 좋아함, 성적으로 거리낌 없는 문란한 타입 — 기존 캐릭터에 없던 유형. 비주얼은 확정 스탠딩 그대로 유지(사용자: 갸루 태그+smirk+tongue out+담배 넣은 v2는 "너무 걸레" → 기각). 성격은 대사·장면에서 표현하고, 담배 등은 해당 장면 CG에서만 소품으로 살짝. 관계: 소영을 좋아함(동성 호감, 2026-11-22) — 둘이 함께 나오는 장면은 `2girls, yuri` 사용, 키 차이(시안 158 / 소영 tall)는 `height difference`로. 가슴은 미요시보다 조금 큼(`0.8::large breasts::`). 실존 인물 사진은 머리색·옷 분위기만 참고(얼굴 오리지널).
- 차별화 표식 5개: 처진 눈 `droopy eyes, tareme` / 컬러렌즈 `grey eyes, colored contacts` (푸른 회색으로 나옴) / 입술 아래 점 `mole under mouth` (루시는 눈 밑 점) / `black choker, multiple earrings` / `long nails, pink nails`.
- 교훈: 다른 캐릭터와 얼굴이 닮은 원인 = 모두 같은 한국형 눈 세트(`almond-shaped eyes, korean-style eyes…`) → 시안은 이 세트를 빼고 처진 눈으로. 핑크 머리는 애니 미소녀 쪽으로 끄는 태그라 Prompt에도 `pink hair` + 캐릭터 `1.2::pink hair::`, `1.2::straight hair::` + UC `wavy hair, curly hair`. 성숙미는 `mature female, adult woman` + UC `young girl, baby face, round face`. 코 태그(`high nose bridge, defined nose`)는 시도했으나 안 하는 게 나음.
- 키 158: 단독 스탠딩에선 무관. 다른 캐릭터와 함께 나오는 장면에선 `shorter than [상대]`/상대에 `tall`로 차이를 줄 것(`petite`는 어려 보여서 금지).
Prompt = 스탠딩 공통 + `pink hair` (cowboy shot 앞에).
### 캐릭터 1
```
1girl, mature female, adult woman, internet streamer, 1.2::pink hair::, long hair, 1.2::straight hair::, see-through bangs, droopy eyes, tareme, medium eyes, double eyelids, grey eyes, colored contacts, eyeliner, aegyo sal, mole under mouth, pink blush, makeup, full lips, glossy pink lips, confident smile, playful, looking at viewer, slim, slim waist, 0.8::large breasts::, black choker, multiple earrings, long nails, pink nails, midriff, navel, black and grey striped long sleeve crop top, pink sweatpants, standing, contrapposto, hand near own face
```
### Undesired Content (스탠딩용)
```
lowres, blurry, worst quality, bad anatomy, bad hands, extra arms, extra fingers, extra legs, child, loli, teenage, young girl, petite, baby face, round face, chibi, old, wrinkles, muscular, abs, heterochromia, 3d, realistic, photo, frame, border, text, logo, watermark, signature, white outline, glowing outline, halo, flat color, sketch, watercolor, large eyes, round eyes, doll eyes, upturned eyes, sharp eyes, eye bags, dark circles, mole under eye, huge breasts, flat chest, black hair, brown hair, blonde hair, short hair, wavy hair, curly hair, other people, scenery, full body, feet, close-up, portrait, upper body, from below, from above, looking down, head out of frame, cropped head, arms out of frame, cropped arms, cut off, nsfw
```
### 장면용 캐릭터 코어 (2026-11-22) — 장면 CG는 이 뒤에 표정·옷·동작만 붙임 (레즈/바니걸 방송 자위/선후 기승위 테스트에서 "대충 나옴")
```
1girl, mature female, adult woman, 1.2::pink hair::, long hair, 1.2::straight hair::, see-through bangs, droopy eyes, tareme, medium eyes, double eyelids, grey eyes, eyeliner, mole under mouth, pink blush, glossy pink lips, slim, slim waist, 0.8::large breasts::, black choker, multiple earrings, long nails, pink nails
```
장면용 UC 코어 (B+ 공통 UC 대신, 섹스씬이면 섹스 UC 추가):
```
lowres, blurry, worst quality, bad anatomy, bad hands, extra arms, extra fingers, extra legs, child, loli, teenage, young girl, petite, baby face, round face, chibi, old, wrinkles, muscular, abs, heterochromia, 3d, realistic, photo, frame, border, text, logo, watermark, signature, white outline, glowing outline, halo, flat color, sketch, large eyes, round eyes, doll eyes, upturned eyes, eye bags, dark circles, mole under eye, huge breasts, flat chest, black hair, brown hair, blonde hair, short hair, wavy hair
```
- 장면 소품: 방송방 `streaming setup, ring light, webcam, monitor, pink led lights`. 바니걸 `playboy bunny, fake animal ears, rabbit ears, black leotard, strapless leotard, wrist cuffs, bowtie, fishnet pantyhose`. 표정은 `teasing smile` 정도까지(혀 내밀기·smirk 과하면 "걸레" 느낌).

---

## ★서하람(신규, 톰보이 오토코노코) 확정 — 이미지 `novelai/캐릭터/서하람/haram_standing.png` (2026-11-22, 이미지 파일 저장 필요)
설정(로컬 Project_H README): 20살, 키 164, **남자(오토코노코), 게이**. 보이시한 여자로 착각받는 남자. 검은 단발·야구모자·후드티·청바지. 편의점 야간 알바, 한강 스케이트파크. 확실한 성인 얼굴·체형(`petite` 금지). 선후(180)와 머리 하나 차이.
- 교훈: 1차는 보이시한 여자로 보임 = 설정 의도대로(첫인상 착각). `grin`/`playful smile`은 과함 → `calm expression, closed mouth` + UC `smile, smirk, grin, teeth`. 작은 키는 단독 스탠딩에서 안 드러남 → `short` + `oversized clothes, sleeves past wrists` + UC `tall, long legs` (앳되면 `short`만 빼기). 스케이트보드는 스탠딩에서 뺌. 한국형 눈 세트 대신 `sharp eyes`로 다른 캐릭터와 차별.
- 키 차이는 선후와 함께 나오는 장면에서 `height difference`로.
Prompt = 스탠딩 공통.
### 캐릭터 1
```
1boy, adult, young man, otoko no ko, androgynous, tomboyish, short, black hair, bob cut, black baseball cap, medium eyes, sharp eyes, dark brown eyes, calm expression, closed mouth, looking at viewer, slim, flat chest, oversized grey hoodie, oversized clothes, sleeves past wrists, blue jeans, standing, contrapposto, hands in hoodie pocket
```
### Undesired Content (스탠딩용)
```
lowres, blurry, worst quality, bad anatomy, bad hands, extra arms, extra fingers, extra legs, child, shota, loli, teenage, petite, baby face, round face, chibi, old, muscular, abs, beard, mustache, facial hair, heterochromia, 3d, realistic, photo, frame, border, text, logo, watermark, signature, white outline, glowing outline, halo, flat color, sketch, large eyes, round eyes, doll eyes, eye bags, dark circles, breasts, cleavage, 1girl, female, long hair, skirt, dress, makeup, skateboard, smile, smirk, grin, teeth, tall, long legs, other people, scenery, full body, feet, close-up, portrait, upper body, from below, from above, looking down, head out of frame, cropped head, arms out of frame, cropped arms, cut off, nsfw
```
- 관계 장면 메모(오토코노코 테스트 2026-11-22): pov 펠라 태그는 역할이 뒤집히므로 2인 제3자 구도 + `2boys, yaoi`, 여자 몸으로 가면 UC `1girl, female, breasts, pussy` 1.2.
### ★서하람 편의점 알바 스탠딩 (확정, 2026-11-22) — 이미지 `novelai/캐릭터/서하람/haram_standing_clerk.png` (이미지 파일 저장 필요)
★**한글 글자 렌더링 성공**: Prompt 맨 끝에 `Text: 서하람` + 해당 소품에 `name tag with name written on it` → 명찰에 "서하람" 정확히 나옴. 조건: Prompt의 `no text` 제거, UC에서 `text` 제거 (`watermark, signature, logo`는 유지).
- 교훈: `green employee vest` → 번들거리는 형광 안전조끼 → `purple fabric employee vest` + UC `safety vest, reflective vest, high-visibility vest, shiny clothes`.
Prompt = 스탠딩 공통에서 `no text`를 `Text: 서하람`으로 교체.
캐릭터 1:
```
1boy, adult, young man, otoko no ko, androgynous, tomboyish, short, black hair, bob cut, black baseball cap, medium eyes, sharp eyes, dark brown eyes, calm expression, closed mouth, looking at viewer, slim, flat chest, convenience store clerk, purple fabric employee vest over grey hoodie, name tag with name written on it, sleeves past wrists, blue jeans, standing, contrapposto, holding barcode scanner
```
UC = 하람 스탠딩 UC에서 `text` 빼고 + `apron, safety vest, reflective vest, high-visibility vest, shiny clothes`.

- 하람 장면 테스트 (2026-11-22, 잘 됨): ① 노출 — 후드티만+`black boxer briefs, bulge`, `ecchi` ② 정상위 애널 — 선후 삽입이라 pov 가능: `yaoi, sex, anal, pov, missionary, from above` + 하람 `legs up, erection, penis in anus, covering mouth with sleeve, red ears` ③ 하람 성기를 작고 예쁘게 = 캐릭터 1에 `small penis, pink penis` + **캐릭터 1 전용 UC** `large penis, veiny penis, dark penis` (전체 UC에 넣으면 선후 쪽도 바뀜).

---

## ★한소영(골퍼) 확정 — 이미지 `novelai/캐릭터/진소영/soyoung_design.png` (쿨뷰티, 2026-11-20)
원칙: 미소 확정 틀 그대로, 머리·표정·체형만 교체. 소영 전용 태그 추가하면 망함
(wavy→파마, blue-black→청색 머리, thick eyebrows/tall/athletic/thick thighs/wide hips→투박·육덕, cool beauty 문장 불필요)
Prompt: B+ + [장면] `outdoors, golf course, green fairway, autumn trees, blue sky, daytime` / [구도] `from below, cowboy shot`

### 캐릭터 1
```
1girl, long straight black hair, center part, forehead, no bangs, almond-shaped eyes, medium eyes, double eyelids, dark grey eyes, small eye highlights, natural eyelashes, natural straight eyebrows, korean-style eyes with defined double eyelids, full lips, coral glossy lips, calm expression, slight smile, looking at viewer, 0.8::athlete::, 0.8::toned body::, healthy skin, slim waist, large breasts, long legs, [의상: sleeveless mint green polo shirt, white pleated golf skirt], [포즈: holding golf club over shoulder, hand on hip]
```

### Undesired Content
```
lowres, blurry, worst quality, bad anatomy, bad hands, extra arms, extra fingers, extra legs, child, chibi, old, narrow eyes, half-closed eyes, muscular, abs, streaked hair, brown hair, blonde hair, blue hair, heterochromia, 3d, frame, border, text, watermark, signature, white outline, glowing outline, halo, flat color, sketch, large eyes, round eyes, sparkling eyes, long eyelashes, thick eyelashes, doll eyes, eye bags, dark circles
```

### ★한소영 골프 대회 (최소 프롬프트, 2026-11-21) — 1344×768, 좋은 컷 나오면 시드 고정
- 교훈: 동작을 지정할수록 망함. `follow-through, finishing swing pose, both hands raised above head, golf club behind head, eyes following the ball` → 손 잘림·야구 자세. 퍼팅 `squatting, holding putter` → 퍼터가 막대기, 옆모습 허공 시선. **동작 태그 전부 빼고 `golfer, playing golf` + `golf tournament, golf course`만 → 자연스러운 스윙.** 안 나오면 시드 재시도(노가다).
- 장갑이 한 손에만 나오는 건 정상(실제 선수도 리드 손에만 낌). 고정하려면 `single glove, white golf glove on left hand`, 없애려면 UC `gloves`.
- 시선이 카메라로 오면 캐릭터에 `looking away` + UC `1.2::looking at viewer::, eye contact`. 공은 UC `golf ball, ball`. 실제 선수 사진 레퍼런스는 자세만 참고, UC `logo, brand name`.
Prompt:
```
masterpiece, best quality, amazing quality, very aesthetic, best illustration, absurdres, incredibly absurdres, extremely detailed, ultra detailed, intricate detail, year2025, vibrant colors, clean lineart, comic shading, best shadow, shiny skin, realistic skin texture, detailed facial skin, detailed eyes, detailed body, soft gradient shading, peach skin, subsurface scattering, rim light, depth of field, light particles, outdoors, golf tournament, golf course, detailed background, cowboy shot, no text
```
캐릭터 1:
```
1girl, long straight black hair, center part, forehead, no bangs, almond-shaped eyes, medium eyes, double eyelids, dark grey eyes, small eye highlights, natural eyelashes, natural straight eyebrows, korean-style eyes with defined double eyelids, full lips, coral glossy lips, 0.8::athlete::, 0.8::toned body::, healthy skin, slim waist, 1.15::large breasts::, white visor, sleeveless teal mock neck top, white golf skirt, golfer, playing golf
```
UC:
```
lowres, blurry, worst quality, bad anatomy, bad hands, extra arms, extra fingers, extra legs, child, chibi, old, narrow eyes, half-closed eyes, muscular, abs, streaked hair, brown hair, blonde hair, blue hair, heterochromia, 3d, frame, border, text, logo, watermark, signature, white outline, glowing outline, halo, flat color, sketch, large eyes, round eyes, sparkling eyes, long eyelashes, thick eyelashes, doll eyes, eye bags, dark circles, huge breasts, nsfw
```

### 한소영 레깅스 벗기 뒷모습 (확정, 성인) — 이미지 `novelai/씬/EP1_P3_leggings_pulldown.png`
Prompt = B+ + `nsfw, indoors, penthouse home gym, from behind, from below, ass focus, close-up, back view`
캐릭터 1 (뒷모습이라 얼굴 태그 생략):
```
1girl, long straight black hair, center part, 0.8::athlete::, 0.8::toned body::, healthy skin, slim waist, large breasts, round butt, white sports bra, grey leggings, navy blue panties, pulling down leggings and panties together, panties pulled down, panties around thighs, leggings around thighs, bare ass, pussy, bent over slightly, facing away
```
UC:
```
lowres, blurry, worst quality, bad anatomy, bad hands, extra arms, extra fingers, extra legs, child, chibi, old, muscular, abs, streaked hair, brown hair, blonde hair, blue hair, 3d, frame, border, text, watermark, signature, white outline, glowing outline, halo, flat color, sketch, other people, censored, mosaic censoring, face, 1.3::looking back::, full body, feet, no panties, white panties
```
- 소영 팬티 색: 남색(navy blue). 성기 숨기려면 `ecchi` + UC `pussy, anus`.

### ★한소영 골프 스윙 (확정, 역동적) — 이미지 `novelai/씬/soyoung_golf_swing.png`
Prompt = B+ + `outdoors, golf course, full body, dynamic angle`
캐릭터 1:
```
1girl, long straight black hair, center part, forehead, no bangs, almond-shaped eyes, medium eyes, double eyelids, dark grey eyes, small eye highlights, natural eyelashes, natural straight eyebrows, korean-style eyes with defined double eyelids, full lips, coral glossy lips, focused expression, 0.8::athlete::, 0.8::toned body::, healthy skin, slim waist, large breasts, white visor, sleeveless teal mock neck top, white golf skirt, mid-swing, swinging golf club, looking at the ball
```
UC = 소영 기본 UC + `other people, looking at viewer, portrait`
- 교훈: 동작 장면이 프로필 사진처럼 나오면 → 기본 표정 `slight smile`을 `focused expression`으로, 동작을 진행형(`mid-swing`)으로, 시선을 대상(`looking at the ball`)으로, UC에 `looking at viewer, portrait`.

### ★한소영 펜트하우스 홈짐 스트레칭 (최종 확정) — 이미지 `novelai/씬/EP1_P3_home_gym_stretching.png`
최소 프롬프트로 성공. Prompt = B+ + `indoors, penthouse home gym, city view window`
캐릭터 1:
```
1girl, long straight black hair, center part, forehead, no bangs, almond-shaped eyes, medium eyes, double eyelids, dark grey eyes, small eye highlights, natural eyelashes, natural straight eyebrows, korean-style eyes with defined double eyelids, full lips, coral glossy lips, expressionless, 0.8::athlete::, 0.8::toned body::, healthy skin, slim waist, large breasts, white sports bra, grey leggings, stretching
```
UC = 소영 기본 UC + `other people`

### 한소영 홈짐 요가 강아지 자세 (구버전, 대체됨) (확정, 옆 앵글) — 이미지 `novelai/씬/EP1_P3_home_gym_yoga.png`
집 안 개인 홈짐(고급 저택). 이 앵글(정측면)이 확정. 엉덩이 앞쪽 앵글 시도는 보류.
Prompt:
```
masterpiece, best quality, amazing quality, very aesthetic, best illustration, absurdres, incredibly absurdres, extremely detailed, ultra detailed, intricate detail, year2025, vibrant colors, clean lineart, comic shading, best shadow, shiny skin, realistic skin texture, detailed facial skin, detailed eyes, detailed body, soft gradient shading, peach skin, subsurface scattering, rim light, depth of field, light particles, ecchi, indoors, gym, yoga mat, window light, blurry gym equipment in background, from side, full body, no text
```
(홈짐 강조 시 장면부: `private home gym in a luxury mansion, spacious room, floor-to-ceiling windows, garden view, wooden floor, modern minimalist interior, yoga mat, few gym machines in background, natural sunlight` + UC `commercial gym, fitness center, crowded, rows of machines`)
캐릭터 1:
```
1girl, long straight black hair, center part, forehead, no bangs, almond-shaped eyes, medium eyes, double eyelids, dark grey eyes, small eye highlights, natural eyelashes, natural straight eyebrows, korean-style eyes with defined double eyelids, full lips, coral glossy lips, expressionless, calm expression, light sweat, looking at viewer, 0.8::athlete::, 0.8::toned body::, healthy skin, slim waist, large breasts, round butt, long legs, white sports bra, grey leggings, tight leggings, yoga, puppy pose, kneeling on yoga mat, hips raised high, chest lowered to floor, arms stretched forward on floor, top-down bottom-up, arched back
```
UC:
```
lowres, blurry, worst quality, bad anatomy, bad hands, extra arms, extra fingers, extra legs, child, chibi, old, narrow eyes, half-closed eyes, muscular, abs, streaked hair, brown hair, blonde hair, blue hair, heterochromia, 3d, frame, border, text, watermark, signature, white outline, glowing outline, halo, flat color, sketch, large eyes, round eyes, sparkling eyes, long eyelashes, thick eyelashes, doll eyes, eye bags, dark circles, other people, water drops, dripping sweat, beige leggings, tan leggings, barbell, dumbbell, holding weights, standing, squatting
```

### 한소영 해변 수영복 (확정) — 이미지 `novelai/씬/soyoung_beach_swimsuit.png`
- [장면]: `ecchi, outdoors, beach, white sand, blue sky, ocean, sunlight, lens flare` / [구도] `from behind, cowboy shot`
- 표정: `slight smile, parted lips`
- 건강미(운동선수): 체형 앞에 `0.8::athlete::, 0.8::toned body::, healthy skin` (근육 과하면 0.6, 약하면 1.0. UC muscular 유지)
- [의상+포즈]: `round butt` 포함, `black t-shirt, black thong bikini bottom, holding golf club, looking over shoulder`

### 한소영 요가 레깅스 (조금 야한 씬) — 이미지 `novelai/씬/soyoung_yoga_leggings.png` (임시)
- [장면]: `nsfw, ecchi, indoors, yoga studio, yoga mat, wooden floor, large windows, morning sunlight, plants` / [구도] `from behind, from below, ass focus, cowboy shot`
- 표정(쿨뷰티 무표정): `expressionless, calm expression, closed mouth, indifferent gaze` — `glaring`은 찡그림, `surprised+open mouth`는 멍한 얼굴
- [의상+포즈]: `white sports bra, sideboob, grey leggings, tight leggings, cameltoe, stretching, standing forward bend, bent over, hands on floor, legs straight, looking over shoulder`
- UC 추가: `other people, barbell, weights, gym equipment, sweat, water drops, frown, furrowed brow, glaring, angry, surprised, open mouth, blush`

### 한소영 레스토랑 "내놔" — 이미지 `novelai/씬/EP2_P1_restaurant.png` (임시, 사용자 불만족)
- [장면]: `indoors, modern restaurant, ring chandelier, wine glasses` / [구도] `from below, cowboy shot`
- 표정: `teasing smile, smirk`
- [의상+포즈]: `light blue polo dress, white collar, v-neck, half sleeves, tight dress, short dress, cleavage, leaning forward toward viewer, holding out hand palm up, asking for something, gimme gesture, other hand on thigh, she holds out her open hand palm up at waist height toward the viewer as if demanding something`

### 교훈
- 웹툰 컷을 Vibe Transfer에 넣으면 결과가 웹툰 채색으로 끌려감 → 게임 CG 목표와 충돌. Vibe 쓰면 V4.5 Full로 강제 전환됨. 기본은 V5 Full + Vibe 없음.
- 눈: `large eyes` 넣으면 인형 눈, `thick eyebrows`/`eye bags` 넣으면 과함. 가중치 1.2 걸면 실눈으로 넘어감.

---

## A. 질감 강화판 (보조) — 피부·옷 질감이 더 필요할 때만
결과: 연습실, 아래에서 올려다본 뒤돌아보기. 피부·새틴 광택 좋음. 땀 과함, 얼굴은 큰 애니 눈.

### Prompt
```
masterpiece, best quality, amazing quality, very aesthetic, best illustration, absurdres, incredibly absurdres, extremely detailed, ultra detailed, intricate detail, year2025, vibrant colors, clean lineart, comic shading, best shadow, shiny skin, realistic skin texture, detailed facial skin, detailed eyes, detailed body, 1.2::detailed skin::, subsurface scattering, skin highlights, sweat, 1.2::detailed fabric::, fabric texture, cotton texture, fabric wrinkles, cloth folds, satin, glossy fabric, 1.2::detailed hair::, individual hair strands, hair sheen, hair highlights, specular highlights, reflected light, rim light, [장면: indoors, dance practice room, mirror, wooden floor, wood grain], detailed background, [구도: from below, cowboy shot], no text
```

### 캐릭터 1 (진미소)
```
1girl, k-pop idol, long straight dark brown hair, waist-length hair, face-framing strands, large eyes, bright eyes, dark grey-brown eyes, thin eyebrows, full lips, coral glossy lips, playful smile, open mouth, slim waist, slim stomach, large breasts, round butt, long legs, [의상: white cotton cropped t-shirt, thin fabric, pink satin dolphin shorts, midriff], [포즈: looking back, hand on hair]
```

### Undesired Content
```
lowres, blurry, worst quality, bad anatomy, bad hands, extra arms, extra fingers, extra legs, child, chibi, old, narrow eyes, half-closed eyes, muscular, abs, streaked hair, blonde hair, heterochromia, 3d, flat color, smooth skin, plastic skin, simple shading, blurry hair, frame, border, text, watermark, signature
```

---

## B. 이전 기본 (갤러리 프롬프트 화풍 + 진미소) — 2026-11-20 확정
결과: 연습실, 엎드려 뒤돌아보기. 피부색·채색이 A보다 캄쟈에 가까움 (사용자 판단). 새 장면은 이걸로 시작.

### Prompt
```
masterpiece, best quality, amazing quality, very aesthetic, best illustration, absurdres, incredibly absurdres, extremely detailed, ultra detailed, intricate detail, year2025, vibrant colors, clean lineart, comic shading, best shadow, shiny skin, realistic skin texture, detailed facial skin, detailed eyes, detailed body, indoors, dance practice room, mirror, wooden floor, detailed background, from below, cowboy shot, no text
```

### 캐릭터 1
```
1girl, k-pop idol, long straight dark brown hair, waist-length hair, face-framing strands, large eyes, bright eyes, dark grey-brown eyes, thin eyebrows, full lips, coral glossy lips, playful smile, open mouth, slim waist, slim stomach, large breasts, round butt, long legs, white cropped t-shirt, pink dolphin shorts, midriff, looking back, hand on hair
```

### Undesired Content
```
lowres, blurry, worst quality, bad anatomy, bad hands, extra arms, extra fingers, extra legs, child, chibi, old, narrow eyes, half-closed eyes, muscular, abs, streaked hair, blonde hair, heterochromia, 3d, frame, border, text, watermark, signature
```

---

## 원본 참고: 갤러리에서 인상 깊었던 그림의 프롬프트 (화풍 출처)
```
masterpiece, best quality, vibrant colors, clean lineart, absurdres, extremely detailed, year2025, shiny skin, ultra detailed, realistic skin texture, detailed eyes, detailed body, indoors, detailed facial skin, wide shot, 1girl, 1 guy, side-by-side, headlock, very aesthetic, masterpiece, no text
masterpiece, best quality, amazing quality, very aesthetic, best illustration, intricate detail, highres, incredibly absurdres, comic shading, best shadow, vibrant colors, shiny skin
```
핵심 화풍 태그: comic shading, shiny skin, realistic skin texture, detailed facial skin, clean lineart, vibrant colors

## 메모
- 성인 장면: [장면] 앞에 `nsfw` 추가, UC 끝에 `, censored, mosaic censoring, bar censor`
- 땀 과하면 `sweat` → `light sweat`
- 화가 태그: `artist:iizuki tasuku` 는 NovelAI가 앎 (미연시 CG 렌더링). 캄쟈는 단보루에 없음 → Vibe Transfer 필요
- 얼굴은 태그로 못 잡음 (실눈 누님 ↔ 동그란 애니 눈 사이를 오감). 구독 후 Vibe Transfer로 진미소 컷 사용 예정

---

## ★아빠 진태석(다니엘 진, 사모펀드 대표) 스탠딩 — 1차 OK (2026-11-22) — 이미지 `novelai/캐릭터/진태석/father_standing.png` (이미지 파일 저장 필요)
프로필: 52세(제안), 185(제안), 신혜의 전남편·소영/미소의 아빠, 싱가포르에서 귀국한 사모펀드 대표. 배드엔딩 루트 중심. 넓은 어깨·짙은 눈썹·희끗한 올백·날카로운 눈매·옅은 수염·그을린 피부 = 의도대로 나옴.
- 1차 결과 메모: 오른손이 턱을 만지는 포즈는 태그 외(모델이 붙임, 사용자 OK). 양쪽 손목에 시계가 하나씩 보임 → 고치려면 `single wristwatch` + UC `multiple watches`. 스리피스 조끼는 안 보임(재킷 단추를 잠가서) — 필요하면 `open jacket, waistcoat`.
Prompt = 스탠딩 공통 + `space above head`.
### 캐릭터 1
```
1boy, solo, mature male, middle-aged man, handsome, korean, grey hair, salt-and-pepper hair, short hair, slicked back hair, sharp eyes, narrow eyes, upturned eyes, dark eyes, thick eyebrows, defined jawline, light stubble, tan skin, tall, broad shoulders, navy three-piece suit, white shirt, dark tie, silver wristwatch, hand in pocket, smirk, cold gaze, looking at viewer
```
### UC
```
lowres, blurry, worst quality, bad anatomy, bad hands, extra arms, extra fingers, extra legs, 1girl, female, breasts, child, chibi, young boy, teenage, old man, elderly, wrinkles, bald, fat, obese, long beard, glasses, long hair, blonde hair, heterochromia, 3d, realistic, photo, frame, border, text, logo, watermark, signature, white outline, glowing outline, halo, flat color, sketch, watercolor, large eyes, round eyes, sparkling eyes, other people, scenery, full body, feet, close-up, portrait, upper body, from above, from below, head out of frame, cropped head, arms out of frame, cropped arms, cut off, nsfw, grin, open mouth
```
