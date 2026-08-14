"""
Full automation for the Stickman Survival Stories channel:

  1. Gemini writes a 10-15 beat survival story as JSON, each beat tagged with
     one of the fixed `env`/`pose` values the Remotion rig already knows how
     to draw (see ../src/StickmanScenes/Scene.tsx and Stickman.tsx).
  2. Edge TTS narrates each beat separately (free, no key).
  3. Openverse supplies a free CC0/CC-BY music bed.
  4. `npx remotion render` renders the final MP4 from those assets.
  5. The video is uploaded to YouTube and a Telegram notification is sent.

Mirrors the proven pattern from ai-tech-shorts-bot / movie-facts-bot
(Gemini + Edge TTS + GitHub Actions + YouTube Data API, all free tiers) —
only the content shape changed, from a single short script to a multi-beat
JSON that drives the Remotion character rig.
"""
import asyncio
import json
import os
import random
import re
import subprocess
import sys
import time
import traceback

import edge_tts
import google_auth_oauthlib.flow
import googleapiclient.discovery
import googleapiclient.http
import requests
from dotenv import load_dotenv
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

load_dotenv()

base_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.dirname(base_dir)  # project-05/
scenes_dir = os.path.join(project_dir, "public", "scenes")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
EDGE_TTS_VOICE = os.getenv("EDGE_TTS_VOICE", "en-US-ChristopherNeural")
TELEGRAM_NOTIFY_TOKEN = os.getenv("TELEGRAM_NOTIFY_TOKEN", "")
TELEGRAM_NOTIFY_CHAT_ID = os.getenv("TELEGRAM_NOTIFY_CHAT_ID", "")
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "3"))
RETRY_DELAY = int(os.getenv("RETRY_DELAY", "2"))
YOUTUBE_CATEGORY_ID = os.getenv("YOUTUBE_CATEGORY_ID", "1")  # Film & Animation
YOUTUBE_PRIVACY_STATUS = os.getenv("YOUTUBE_PRIVACY_STATUS", "public")
YOUTUBE_MADE_FOR_KIDS = os.getenv("YOUTUBE_MADE_FOR_KIDS", "false").lower() == "true"
MIN_BEATS = int(os.getenv("MIN_BEATS", "10"))
MAX_BEATS = int(os.getenv("MAX_BEATS", "15"))

ENVS = [
    "forest-day", "blizzard", "dusk-shelter", "campfire-night", "predawn",
    "dawn-rescue", "frozen-river", "sunny-meadow", "recovery-room",
]
POSES = ["walk", "confused", "build", "sit-fire", "stand-wave"]

STRONG_HASHTAG_POOL = [
    "#survival", "#truestory", "#stickman", "#animation", "#youtubestory",
    "#wilderness", "#mountainsurvival", "#basedonatruestory", "#shorts",
    "#storytime", "#didyouknow", "#outdoors",
]


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def send_telegram(message: str):
    if not TELEGRAM_NOTIFY_TOKEN or not TELEGRAM_NOTIFY_CHAT_ID:
        return
    try:
        requests.post(
            f"https://api.telegram.org/bot{TELEGRAM_NOTIFY_TOKEN}/sendMessage",
            json={"chat_id": TELEGRAM_NOTIFY_CHAT_ID, "text": message, "parse_mode": "HTML"},
            timeout=10,
        )
    except Exception:
        pass


def retry_with_backoff(func, max_retries=MAX_RETRIES, retry_delay=RETRY_DELAY):
    for attempt in range(max_retries):
        try:
            return func()
        except Exception as e:
            if attempt < max_retries - 1:
                wait = retry_delay * (2 ** attempt)
                log(f"WARN retry {attempt + 1}/{max_retries} after error: {str(e)[:150]} (sleep {wait}s)")
                time.sleep(wait)
            else:
                log(f"ERROR giving up after {max_retries} attempts")
                raise


# --- 1. Gemini story generation --------------------------------------------

SCENARIOS = [
    "a solo hiker caught in an early-season blizzard on a mountain trail",
    "a backcountry skier who triggers a small avalanche and gets separated from their group",
    "a hunter whose truck breaks down miles from the nearest road in freezing weather",
    "a research assistant stranded overnight when a snowstorm closes the only mountain pass",
    "a father and teenage son who get lost on a winter camping trip",
    "a trail runner who takes a wrong turn as a whiteout rolls in",
    "a group of friends whose snowmobile breaks down far from the lodge",
    "a photographer who stays out too late chasing a shot and gets caught by nightfall and cold",
]

PROMPT_TEMPLATE = """You are writing a narrated survival-story video script for a YouTube channel that
uses a simple animated stick-figure character.

Scenario: {scenario}

Write a dramatized (not naming any real, identifiable person) survival story about this scenario,
told in third person, in the style of a tense, grounded "based on true events" YouTube narration.

Respond ONLY with JSON in this exact shape, no markdown, no extra text:
{{
  "title": "...",
  "description": "...",
  "hashtags": "...",
  "beats": [
    {{"text": "...", "env": "...", "pose": "..."}},
    ...
  ]
}}

Rules:
- "beats": {min_beats} to {max_beats} items. Each beat is 1-3 sentences of narration (15-30 words),
  present-tense-feeling but written in past tense, building the story in order: setup, the danger
  starting, getting worse, a low point, and a resolution (rescue or survival). No dialogue in quotes.
- "env" MUST be exactly one of: {envs}. Use "forest-day" or "sunny-meadow" only for calm/before/after
  beats, "blizzard"/"frozen-river" for active danger, "dusk-shelter" for building shelter,
  "campfire-night"/"predawn" for the overnight survival stretch, "dawn-rescue" for the rescue moment,
  "recovery-room" only for a final beat after rescue. Reuse envs across beats when it fits the story beat.
- "pose" MUST be exactly one of: {poses}. Use "walk" for travel/searching, "confused" for
  disorientation/fear/listening, "build" for shelter-building, "sit-fire" for resting/huddling/cold,
  "stand-wave" for greeting/signaling/calm moments.
- "title": under 70 characters, no hashtags, no clickbait ALL CAPS.
- "description": 2-3 sentences summarizing the video, no hashtags in it.
- "hashtags": exactly 8 tags starting with "#", space separated, must include "#shorts" is NOT
  required (this is a long-form video) — instead include "#survival" and "#stickman".
"""


def _gemini_request(prompt: str):
    models = [
        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}",
        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}",
        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key={GEMINI_API_KEY}",
    ]
    for url in models:
        model_name = url.split("models/")[1].split(":")[0]
        try:
            resp = requests.post(
                url,
                json={"contents": [{"parts": [{"text": prompt}]}]},
                timeout=30,
                headers={"Content-Type": "application/json"},
            )
            if resp.status_code != 200:
                log(f"WARN {model_name}: HTTP {resp.status_code}")
                continue
            payload = resp.json()
            parts = payload.get("candidates", [{}])[0].get("content", {}).get("parts", [])
            if not parts or "text" not in parts[0]:
                continue
            raw = parts[0]["text"].strip()
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            if not match:
                continue
            return json.loads(match.group())
        except Exception as e:
            log(f"WARN {model_name} error: {str(e)[:150]}")
    raise RuntimeError("All Gemini models failed")


def validate_story(data: dict) -> dict:
    beats = data.get("beats", [])
    if not (MIN_BEATS <= len(beats) <= MAX_BEATS):
        raise ValueError(f"beat count {len(beats)} outside [{MIN_BEATS}, {MAX_BEATS}]")
    for b in beats:
        if b.get("env") not in ENVS:
            raise ValueError(f"invalid env: {b.get('env')}")
        if b.get("pose") not in POSES:
            raise ValueError(f"invalid pose: {b.get('pose')}")
        if not b.get("text", "").strip():
            raise ValueError("empty beat text")
    if not data.get("title"):
        raise ValueError("missing title")
    return data


FALLBACK_STORY = {
    "title": "Stranded: A Winter Survival Story",
    "description": "A solo hiker gets caught in an early-season blizzard and has to survive the night.",
    "hashtags": "#survival #stickman #truestory #wilderness #mountainsurvival #outdoors #storytime #animation",
    "beats": [
        {"text": "Every year, thousands of hikers underestimate how fast a quiet mountain trail can turn deadly. This is one of those stories.", "env": "forest-day", "pose": "stand-wave"},
        {"text": "Three days into the solo hike, the trail disappeared under two feet of fresh snow.", "env": "forest-day", "pose": "walk"},
        {"text": "The storm rolled in faster than the forecast promised, swallowing the ridge line in white.", "env": "blizzard", "pose": "walk"},
        {"text": "By early afternoon he was no longer following a trail, only his own instincts.", "env": "blizzard", "pose": "confused"},
        {"text": "By nightfall, he'd stripped pine branches into a makeshift shelter, packing snow along the edges.", "env": "dusk-shelter", "pose": "build"},
        {"text": "The fire was the only thing standing between him and the cold.", "env": "campfire-night", "pose": "sit-fire"},
        {"text": "He talked to himself just to hear a voice, counting his own heartbeat until first light.", "env": "predawn", "pose": "sit-fire"},
        {"text": "When the search team's flashlights broke through the treeline at dawn, he was hypothermic, but alive.", "env": "dawn-rescue", "pose": "stand-wave"},
        {"text": "Two weeks later, wrapped in a hospital blanket instead of a snowbank, he made one promise: never again, until the next trail.", "env": "recovery-room", "pose": "sit-fire"},
        {"text": "Follow for the next survival story.", "env": "sunny-meadow", "pose": "stand-wave"},
    ],
}


def get_story() -> dict:
    scenario = random.choice(SCENARIOS)
    prompt = PROMPT_TEMPLATE.format(
        scenario=scenario, min_beats=MIN_BEATS, max_beats=MAX_BEATS,
        envs=", ".join(ENVS), poses=", ".join(POSES),
    )
    try:
        return retry_with_backoff(lambda: validate_story(_gemini_request(prompt)))
    except Exception as e:
        log(f"WARN Gemini story generation failed entirely, using fallback: {e}")
        return FALLBACK_STORY


# --- 2. Edge TTS narration per beat -----------------------------------------

async def _synth(text: str, dest: str):
    communicate = edge_tts.Communicate(text, voice=EDGE_TTS_VOICE)
    audio = bytearray()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio.extend(chunk["data"])
    with open(dest, "wb") as f:
        f.write(bytes(audio))


def ffprobe_duration(path: str) -> float:
    out = subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", path,
    ])
    return float(out.decode().strip())


def narrate_beats(beats: list) -> list:
    os.makedirs(scenes_dir, exist_ok=True)
    raw_beats = []
    for i, beat in enumerate(beats, start=1):
        dest = os.path.join(scenes_dir, f"live_narration_{i}.mp3")

        def _job(text=beat["text"], d=dest):
            asyncio.run(_synth(text, d))
            if os.path.getsize(d) < 800:
                raise RuntimeError("narration file too small")

        retry_with_backoff(_job)
        duration = ffprobe_duration(dest)
        raw_beats.append({
            "text": beat["text"],
            "audio": f"scenes/live_narration_{i}.mp3",
            "duration": round(duration, 3),
            "env": beat["env"],
            "pose": beat["pose"],
        })
        log(f"beat {i}/{len(beats)}: {duration:.2f}s ({beat['env']}/{beat['pose']})")
    return raw_beats


# --- 3. Music (Openverse, free, no key) -------------------------------------

MUSIC_QUERIES = ["cinematic ambient", "emotional piano", "dramatic ambient", "tension", "orchestral"]


def fetch_music(min_duration_sec: float) -> bool:
    dest = os.path.join(scenes_dir, "music.mp3")
    for query in random.sample(MUSIC_QUERIES, len(MUSIC_QUERIES)):
        try:
            resp = requests.get(
                "https://api.openverse.org/v1/audio/",
                params={"q": query, "category": "music", "license": "cc0,by", "page_size": 20},
                timeout=15,
                headers={"User-Agent": "StickmanSurvivalBot/1.0"},
            )
            resp.raise_for_status()
            results = resp.json().get("results", [])
            candidates = [r for r in results if r.get("duration") and r["duration"] >= (min_duration_sec + 5) * 1000 and r.get("url")]
            if not candidates:
                continue
            track = random.choice(candidates)
            dl = requests.get(track["url"], stream=True, timeout=30)
            dl.raise_for_status()
            with open(dest, "wb") as f:
                for chunk in dl.iter_content(chunk_size=1024 * 256):
                    f.write(chunk)
            if os.path.getsize(dest) < 10_000:
                continue
            log(f"music: '{track.get('title')}' by {track.get('creator')} ({query})")
            return True
        except Exception as e:
            log(f"WARN music query '{query}' failed: {str(e)[:120]}")
    log("WARN no music found, rendering without a music bed")
    if os.path.exists(dest):
        os.remove(dest)
    return False


# --- 4. Remotion render -------------------------------------------------

def render_video() -> str:
    out_path = os.path.join(project_dir, "out", "live_render.mp4")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    cmd = ["npx", "remotion", "render", "StickmanStory", out_path, "--log=info"]
    log(f"rendering: {' '.join(cmd)}")
    subprocess.run(cmd, cwd=project_dir, check=True, shell=(sys.platform == "win32"))
    return out_path


# --- 5. YouTube upload -------------------------------------------------

def upload_to_youtube(video_path: str, title: str, description: str, tags: list):
    scopes = ["https://www.googleapis.com/auth/youtube.upload"]
    client_file = os.path.join(base_dir, "client_secrets.json")
    token_file = os.path.join(base_dir, "youtube_token.json")

    credentials = None
    if os.path.exists(token_file):
        credentials = Credentials.from_authorized_user_file(token_file, scopes)
        if credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
            with open(token_file, "w") as f:
                f.write(credentials.to_json())

    if credentials is None:
        flow = google_auth_oauthlib.flow.InstalledAppFlow.from_client_secrets_file(client_file, scopes)
        credentials = flow.run_local_server(port=0, open_browser=True)
        with open(token_file, "w") as f:
            f.write(credentials.to_json())

    youtube = googleapiclient.discovery.build("youtube", "v3", credentials=credentials)
    body = {
        "snippet": {
            "title": title,
            "description": description,
            "categoryId": YOUTUBE_CATEGORY_ID,
            "tags": tags,
        },
        "status": {
            "privacyStatus": YOUTUBE_PRIVACY_STATUS,
            "selfDeclaredMadeForKids": YOUTUBE_MADE_FOR_KIDS,
        },
    }
    media = googleapiclient.http.MediaFileUpload(video_path, chunksize=1024 * 1024, resumable=True)
    request = youtube.videos().insert(part="snippet,status", body=body, media_body=media)
    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            log(f"upload progress: {int(status.progress() * 100)}%")
    log(f"uploaded: https://youtube.com/watch?v={response['id']}")
    return response["id"]


def parse_tags(hashtags: str) -> list:
    seen, tags = set(), []
    for tag in hashtags.split():
        clean = tag.lstrip("#").strip()
        if clean and clean.lower() not in seen:
            seen.add(clean.lower())
            tags.append(clean)
    return tags


# --- main -------------------------------------------------------------

def run(skip_upload: bool = False):
    log("=== Stickman Survival Story: generation started ===")

    story = get_story()
    log(f"title: {story['title']} ({len(story['beats'])} beats)")

    raw_beats = narrate_beats(story["beats"])
    total_duration = sum(b["duration"] for b in raw_beats)

    with open(os.path.join(scenes_dir, "live_beats.json"), "w", encoding="utf-8") as f:
        json.dump(raw_beats, f, indent=2)

    fetch_music(total_duration)

    video_path = retry_with_backoff(render_video, max_retries=2)
    log(f"render complete: {video_path}")

    if skip_upload:
        log("skip_upload=True, not uploading")
        return

    tags = parse_tags(story["hashtags"])
    description = f"{story['description']}\n\n{story['hashtags']}"
    video_id = retry_with_backoff(lambda: upload_to_youtube(video_path, story["title"], description, tags))

    send_telegram(
        f"✅ <b>New Stickman Survival Story uploaded!</b>\n"
        f"📌 {story['title']}\n"
        f"🔗 https://youtube.com/watch?v={video_id}"
    )


if __name__ == "__main__":
    try:
        run(skip_upload="--skip-upload" in sys.argv)
    except Exception as e:
        log(f"FATAL: {e}")
        log(traceback.format_exc())
        send_telegram(f"❌ <b>Stickman Survival Story generation failed!</b>\n<code>{str(e)[:300]}</code>")
        raise
