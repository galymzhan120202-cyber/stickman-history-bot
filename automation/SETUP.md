# Stickman Survival Stories — Setup нұсқаулығы

Код толық дайын (`generate_story.py`, `.github/workflows/upload.yml`).
Визуал — Remotion (`../src/StickmanScenes`), таза кодпен сызылған, footage/AI
image API керек емес. Төмендегі қадамдарды тек сіз қолмен жасай аласыз.

## Қалай жұмыс істейді

1. Gemini таңдалған сценарийге (боран, көшкін, адасу, т.б.) сай **10-15
   сахналық** оқиға жазады — әр сахна тек екі бекітілген тізімнен (`env`,
   `pose`) таңдайды, сондықтан Remotion әрқашан суретін біледі.
2. Edge TTS әр сахнаны бөлек дауыстайды (тегін).
3. Openverse-тен фон әуен алынады (тегін, кілтсіз).
4. `npx remotion render StickmanStory` толық видеоны жинайды.
5. YouTube Data API арқылы жүктеледі, Telegram-ға хабарлама кетеді.

## 1. Жаңа YouTube арна

1. Жаңа Google аккаунт/Brand Account ашыңыз, арнаны survival-story нишасына
   сай атаумен баптаңыз.

## 2. Google Cloud OAuth

1. https://console.cloud.google.com — жаңа жоба (мыс. `StickmanSurvivalBot`).
2. **YouTube Data API v3**-ті қосыңыз.
3. **OAuth consent screen** → External → бірден **"In production"**.
4. **Credentials → OAuth client ID → Desktop app** → JSON жүктеп, осы папкаға
   `client_secrets.json` деп сақтаңыз.
5. Жергілікті бір рет: `python generate_story.py --skip-upload` арқылы сынап,
   содан кейін upload-пен (`python generate_story.py`) — браузерде жаңа
   арнамен логин болып, `youtube_token.json` жасалады.

## 3. GitHub repo + Secrets

1. `project-05` папкасын жаңа GitHub repo-ға push етіңіз.
2. Settings → Secrets and variables → Actions → 5 Secret:
   - `STICKMAN_GEMINI_API_KEY`
   - `STICKMAN_TELEGRAM_NOTIFY_TOKEN`
   - `STICKMAN_TELEGRAM_NOTIFY_CHAT_ID`
   - `STICKMAN_CLIENT_SECRETS_JSON` — `client_secrets.json` мазмұны
   - `STICKMAN_YOUTUBE_TOKEN_JSON` — `youtube_token.json` мазмұны

## 4. Тексеру реті

1. `.env.example`-ды `.env` етіп көшіріп, `GEMINI_API_KEY` толтырыңыз.
2. `pip install -r requirements.txt` (осы `automation/` папкасында)
3. Жоғарғы деңгейде (`project-05/`): `npm install` (Remotion үшін, бір рет).
4. Жергілікті сынау (жүктеместен): `python generate_story.py --skip-upload`
   — `../out/live_render.mp4` пайда болуы керек.
5. Видеоны тексеріңіз (сахналар дұрыс ауыса ма, дауыс/субтитр сай ма).
6. Нақты жүктеуді бір рет қолмен сынаңыз: `python generate_story.py`
7. GitHub Actions-та `workflow_dispatch` арқылы бір рет қолмен іске қосып
   тексеріңіз (уақытын өлшеп, қажет болса `timeout-minutes` түзетіңіз).
8. Содан кейін ғана cron кестесіне (`upload.yml`, қазір күніне 1 рет,
   11:00 KZ) сеніп қалдырыңыз.

## Кеңейту

Жаңа орта/поза қосу үшін тек `src/StickmanScenes/Scene.tsx` (ENV тізімі) және
`Stickman.tsx` (Pose) файлдарын өзгертіп, `generate_story.py`-дегі `ENVS`/
`POSES` тізімдеріне қосыңыз — Gemini промпты автоматты жаңа опцияларды
пайдалана бастайды.
