"""
Full automation for the Stickman Survival Stories channel:

  1. Gemini writes a 10-15 beat survival story as JSON. Each beat gets its
     own narration + a specific image_prompt describing exactly what's
     happening in that beat (no fixed env enum — the background is
     generated fresh per beat so it can match the text precisely).
  2. Pollinations.ai generates a background image per beat (free, no key).
  3. Edge TTS narrates each beat separately (free, no key).
  4. Openverse supplies a free CC0/CC-BY music bed.
  5. `npx remotion render` composites the procedural Stickman character over
     each beat's image (see ../src/StickmanScenes/AIBackdropScene.tsx).
  6. The video is uploaded to YouTube and a Telegram notification is sent.

Mirrors the proven pattern from ai-tech-shorts-bot / movie-facts-bot
(Gemini + Edge TTS + GitHub Actions + YouTube Data API, all free tiers).
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
import urllib.parse

import edge_tts
import google_auth_oauthlib.flow
import googleapiclient.discovery
import googleapiclient.http
import requests
from dotenv import load_dotenv
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from PIL import Image, ImageDraw, ImageFont, ImageOps

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
MIN_BEATS = int(os.getenv("MIN_BEATS", "16"))
MAX_BEATS = int(os.getenv("MAX_BEATS", "22"))

POSES = ["walk", "confused", "build", "sit-fire", "stand-wave"]

IMAGE_STYLE_SUFFIX = (
    ", flat 2D vector illustration, vibrant saturated colors, cinematic lighting, "
    "wide environmental establishing shot, no people, no characters, no humans, no text, no watermark"
)

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
overlays a simple animated stick-figure character on top of a real generated background image. A
fresh background image is generated for every single beat, so describing EXACTLY what that beat's
background should look like is the most important part of this task — more important than variety.
A background that doesn't match what the text says is happening (e.g. a bright calm forest during a
beat about a life-threatening blizzard) is a hard failure.

Scenario: {scenario}

Write a dramatized (not naming any real, identifiable person) survival story about this scenario,
told in third person, in the style of a tense, grounded "based on true events" YouTube narration.

Respond ONLY with JSON in this exact shape, no markdown, no extra text:
{{
  "title": "...",
  "thumbnail_text": "...",
  "description": "...",
  "hashtags": "...",
  "beats": [
    {{"text": "...", "image_prompt": "...", "pose": "...", "cold": true}},
    ...
  ]
}}

Rules:
- "thumbnail_text": 2-5 words, ALL CAPS, the single most shocking/curiosity-driving phrase from the
  story (e.g. "TRAPPED IN THE ICE", "NO ONE WAS COMING"). Must be readable in under a second — this
  is NOT the title, it's much shorter and punchier.
- "beats": {min_beats} to {max_beats} items. Each beat is exactly ONE short sentence of narration
  (9-16 words, roughly 4-7 seconds spoken), present-tense-feeling but written in past tense, building
  in order: calm opening, danger starting, getting worse, the overnight low point, the rescue, a short
  resolution. No dialogue in quotes. Keep it punchy — cut adjectives that don't add new information,
  every beat should move the story forward by one concrete event, not restate the previous beat's mood.
- "image_prompt": a concrete, specific visual description (under 25 words) of ONLY the environment/
  setting for exactly what this beat's text describes right now — exact weather, time of day, and
  1-2 specific objects (e.g. "steep snow-covered pine ridge in a whiteout blizzard, low visibility",
  "small snow cave shelter glowing from a fire inside, night, falling snow", "hospital room window
  at sunrise, warm light, folded blanket"). Do NOT mention any person, character, human, or figure —
  a character is added on top of the image separately. Do not repeat the same image_prompt on two
  different beats even if the setting is similar — vary camera distance/angle/detail each time.
- "pose": MUST be exactly one of: {poses}. Use "walk" for travel/searching, "confused" for
  disorientation/fear/listening, "build" for shelter-building, "sit-fire" for resting/huddling/cold,
  "stand-wave" for greeting/signaling/celebrating/spotting something in the distance.
- "cold": true if the character is currently exposed to dangerous cold in this beat (visible breath,
  huddled shivering), false for the calm opening beat, indoor recovery, or a warm memory/flashback.
- "title": under 70 characters, no hashtags, no clickbait ALL CAPS.
- "description": 2-3 sentences summarizing the video, no hashtags in it.
- "hashtags": exactly 8 tags starting with "#", space separated, must include "#survival" and
  "#stickman".
"""


def _gemini_request(prompt: str):
    models = [
        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}",
        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={GEMINI_API_KEY}",
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
        if b.get("pose") not in POSES:
            raise ValueError(f"invalid pose: {b.get('pose')}")
        if not b.get("text", "").strip():
            raise ValueError("empty beat text")
        if not b.get("image_prompt", "").strip():
            raise ValueError("empty image_prompt")
        b["cold"] = bool(b.get("cold", True))
    if not data.get("title"):
        raise ValueError("missing title")
    if not data.get("thumbnail_text", "").strip():
        data["thumbnail_text"] = data["title"].upper()
    return data


FALLBACK_STORY = {
    "title": "Stranded: A Winter Survival Story",
    "thumbnail_text": "TRAPPED IN THE STORM",
    "description": "A solo hiker gets caught in an early-season blizzard and has to survive the night.",
    "hashtags": "#survival #stickman #truestory #wilderness #mountainsurvival #outdoors #storytime #animation",
    "beats": [
        {"text": "Every year, thousands of hikers underestimate how fast a quiet mountain trail can turn deadly. This is one of those stories.", "image_prompt": "sunny pine forest trailhead, bright morning light, clear blue sky", "pose": "stand-wave", "cold": False},
        {"text": "Three days into the solo hike, the trail disappeared under two feet of fresh snow.", "image_prompt": "snow-buried hiking trail vanishing into dense pine forest, overcast sky", "pose": "walk", "cold": True},
        {"text": "The storm rolled in faster than the forecast promised, swallowing the ridge line in white.", "image_prompt": "whiteout blizzard engulfing a mountain ridge, low visibility, heavy snow", "pose": "walk", "cold": True},
        {"text": "By early afternoon he was no longer following a trail, only his own instincts.", "image_prompt": "disorienting dense snowy forest, no visible path, swirling snow", "pose": "confused", "cold": True},
        {"text": "By nightfall, he'd stripped pine branches into a makeshift shelter, packing snow along the edges.", "image_prompt": "makeshift pine-branch snow shelter under construction, dusk light, snowy clearing", "pose": "build", "cold": True},
        {"text": "The fire was the only thing standing between him and the cold.", "image_prompt": "small glowing campfire inside a snow shelter at night, warm firelight", "pose": "sit-fire", "cold": True},
        {"text": "He talked to himself just to hear a voice, counting his own heartbeat until first light.", "image_prompt": "dying embers of a campfire, faint grey predawn light through snowy trees", "pose": "sit-fire", "cold": True},
        {"text": "When the search team's flashlights broke through the treeline at dawn, he was hypothermic, but alive.", "image_prompt": "search and rescue flashlight beams sweeping a snowy treeline at sunrise", "pose": "stand-wave", "cold": False},
        {"text": "Two weeks later, wrapped in a hospital blanket instead of a snowbank, he made one promise: never again, until the next trail.", "image_prompt": "cozy hospital room window at sunrise, warm light, folded blanket on a bed", "pose": "sit-fire", "cold": False},
        {"text": "Follow for the next survival story.", "image_prompt": "sunny green mountain meadow, blue sky, distant snowy peaks", "pose": "stand-wave", "cold": False},
    ],
}


def get_story() -> dict:
    scenario = random.choice(SCENARIOS)
    prompt = PROMPT_TEMPLATE.format(
        scenario=scenario, min_beats=MIN_BEATS, max_beats=MAX_BEATS, poses=", ".join(POSES),
    )
    try:
        return retry_with_backoff(lambda: validate_story(_gemini_request(prompt)))
    except Exception as e:
        log(f"WARN Gemini story generation failed entirely, using fallback: {e}")
        return FALLBACK_STORY


# --- 2. Edge TTS narration + Pollinations background image per beat --------

async def _synth(text: str, dest: str) -> list:
    """Synthesizes narration and returns per-word timing (edge-tts's
    WordBoundary events, offset/duration in 100ns units) so captions can
    highlight the exact word being spoken instead of showing a static
    sentence for its whole duration."""
    communicate = edge_tts.Communicate(text, voice=EDGE_TTS_VOICE)
    audio = bytearray()
    words = []
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio.extend(chunk["data"])
        elif chunk["type"] == "WordBoundary":
            words.append({
                "text": chunk["text"],
                "start": round(chunk["offset"] / 10_000_000, 3),
                "duration": round(chunk["duration"] / 10_000_000, 3),
            })
    with open(dest, "wb") as f:
        f.write(bytes(audio))
    return words


def ffprobe_duration(path: str) -> float:
    out = subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", path,
    ])
    return float(out.decode().strip())


def fetch_beat_image(prompt: str, seed: int, dest: str):
    """Pollinations.ai — free, keyless text-to-image. Deterministic per
    (prompt, seed) so a retry doesn't burn quota re-rolling a working image."""
    query = urllib.parse.quote(prompt + IMAGE_STYLE_SUFFIX)
    url = f"https://image.pollinations.ai/prompt/{query}?width=1920&height=1080&nologo=true&seed={seed}"
    resp = requests.get(url, timeout=60)
    resp.raise_for_status()
    if len(resp.content) < 5_000:
        raise RuntimeError("image response too small")
    with open(dest, "wb") as f:
        f.write(resp.content)


def process_beats(beats: list) -> list:
    """For every beat: fetch its background image and synthesize its
    narration, then assemble the RawLiveBeat the Remotion side expects."""
    os.makedirs(scenes_dir, exist_ok=True)
    raw_beats = []
    for i, beat in enumerate(beats, start=1):
        audio_dest = os.path.join(scenes_dir, f"live_narration_{i}.mp3")
        image_dest = os.path.join(scenes_dir, f"live_bg_{i}.jpg")

        words_holder = {}

        def _audio_job(text=beat["text"], d=audio_dest, holder=words_holder):
            holder["words"] = asyncio.run(_synth(text, d))
            if os.path.getsize(d) < 800:
                raise RuntimeError("narration file too small")

        def _image_job(prompt=beat["image_prompt"], d=image_dest, seed=i * 137 + 7):
            fetch_beat_image(prompt, seed, d)

        retry_with_backoff(_audio_job)
        retry_with_backoff(_image_job)
        duration = ffprobe_duration(audio_dest)
        raw_beats.append({
            "text": beat["text"],
            "audio": f"scenes/live_narration_{i}.mp3",
            "image": f"scenes/live_bg_{i}.jpg",
            "duration": round(duration, 3),
            "pose": beat["pose"],
            "cold": beat["cold"],
            "words": words_holder.get("words", []),
        })
        log(f"beat {i}/{len(beats)}: {duration:.2f}s ({beat['pose']}, cold={beat['cold']})")
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


def make_thumbnail(image_path: str, title: str) -> str:
    """1280x720 thumbnail: the most dramatic beat's AI background, cropped to
    16:9, with the video title in bold stroked text over a bottom gradient —
    the "contrast, conflict, readable in under a second" thumbnail advice."""
    dest = os.path.join(scenes_dir, "thumbnail.jpg")
    img = Image.open(image_path).convert("RGB")
    img = ImageOps.fit(img, (1280, 720), method=Image.LANCZOS)

    gradient = Image.new("L", (1, 720), color=0)
    for y in range(720):
        gradient.putpixel((0, y), int(200 * max(0, (y - 380) / 340)))
    gradient = gradient.resize((1280, 720))
    shadow = Image.new("RGB", (1280, 720), (0, 0, 0))
    img = Image.composite(shadow, img, gradient)

    draw = ImageDraw.Draw(img)
    font_path = os.path.join(project_dir, "public", "theboldfont.ttf")
    font_size = 130
    font = ImageFont.truetype(font_path, font_size)

    words = title.upper().split()
    lines, current = [], ""
    max_width = 1180
    for word in words:
        trial = f"{current} {word}".strip()
        if draw.textlength(trial, font=font) > max_width and current:
            lines.append(current)
            current = word
        else:
            current = trial
    if current:
        lines.append(current)
    lines = lines[:2]

    total_h = len(lines) * (font_size + 14)
    y = 700 - total_h
    for line in lines:
        w = draw.textlength(line, font=font)
        x = (1280 - w) / 2
        draw.text((x, y), line, font=font, fill="white", stroke_width=8, stroke_fill="black")
        y += font_size + 14

    img.save(dest, quality=92)
    return dest


# --- 5. YouTube upload -------------------------------------------------

YOUTUBE_SCOPES = ["https://www.googleapis.com/auth/youtube"]  # full scope: upload + read + thumbnails


def get_youtube_credentials():
    client_file = os.path.join(base_dir, "client_secrets.json")
    token_file = os.path.join(base_dir, "youtube_token.json")

    credentials = None
    if os.path.exists(token_file):
        credentials = Credentials.from_authorized_user_file(token_file, YOUTUBE_SCOPES)
        if credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
            with open(token_file, "w") as f:
                f.write(credentials.to_json())

    if credentials is None:
        flow = google_auth_oauthlib.flow.InstalledAppFlow.from_client_secrets_file(client_file, YOUTUBE_SCOPES)
        credentials = flow.run_local_server(port=0, open_browser=True)
        with open(token_file, "w") as f:
            f.write(credentials.to_json())
    return credentials


def upload_to_youtube(video_path: str, title: str, description: str, tags: list, thumbnail_path: str = None):
    credentials = get_youtube_credentials()
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
    video_id = response["id"]
    log(f"uploaded: https://youtube.com/watch?v={video_id}")

    if thumbnail_path and os.path.exists(thumbnail_path):
        try:
            youtube.thumbnails().set(
                videoId=video_id, media_body=googleapiclient.http.MediaFileUpload(thumbnail_path)
            ).execute()
            log("custom thumbnail set")
        except Exception as e:
            # Custom thumbnails require a phone-verified channel — non-fatal,
            # YouTube just keeps its auto-picked frame instead.
            log(f"WARN could not set thumbnail (channel phone-verified?): {str(e)[:200]}")

    return video_id


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

    raw_beats = process_beats(story["beats"])
    total_duration = sum(b["duration"] for b in raw_beats)

    with open(os.path.join(scenes_dir, "live_beats.json"), "w", encoding="utf-8") as f:
        json.dump(raw_beats, f, indent=2)

    fetch_music(total_duration)

    video_path = retry_with_backoff(render_video, max_retries=2)
    log(f"render complete: {video_path}")

    # Pick a beat from the dramatic middle stretch (not the calm opening or
    # resolution) as the thumbnail's background image.
    climax_idx = min(len(raw_beats) - 1, max(0, round(len(raw_beats) * 0.65)))
    thumbnail_source = os.path.join(project_dir, "public", raw_beats[climax_idx]["image"])
    thumbnail_path = make_thumbnail(thumbnail_source, story["thumbnail_text"])
    log(f"thumbnail: {thumbnail_path} (from beat {climax_idx + 1})")

    if skip_upload:
        log("skip_upload=True, not uploading")
        return

    tags = parse_tags(story["hashtags"])
    description = f"{story['description']}\n\n{story['hashtags']}"
    video_id = retry_with_backoff(
        lambda: upload_to_youtube(video_path, story["title"], description, tags, thumbnail_path)
    )

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
