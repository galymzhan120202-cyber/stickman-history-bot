"""
One-time helper: turns client_secrets.json into youtube_token.json.

Run this after downloading client_secrets.json from Google Cloud Console —
it opens your default browser for you to log in and grant upload access to
your YouTube channel. Your password never passes through this script; Google
handles the login on its own page.
"""
import os
import sys
import io
import google_auth_oauthlib.flow

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

base_dir = os.path.dirname(os.path.abspath(__file__))
scopes = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly",
]
client_file = os.path.join(base_dir, "client_secrets.json")
token_file = os.path.join(base_dir, "youtube_token.json")

if not os.path.exists(client_file):
    raise SystemExit(
        f"client_secrets.json табылмады: {client_file}\n"
        "Алдымен Google Cloud Console-дан OAuth client JSON-ды жүктеп, осы атаумен осы папкаға салыңыз."
    )

flow = google_auth_oauthlib.flow.InstalledAppFlow.from_client_secrets_file(client_file, scopes)
credentials = flow.run_local_server(
    port=0,
    open_browser=True,
    authorization_prompt_message="Log in with the Google account for your new YouTube channel: {url}",
    success_message="Success! You can close this window now.",
)

with open(token_file, "w") as f:
    f.write(credentials.to_json())

print(f"\n✓ Сақталды: {token_file}")
print("Енді python generate_story.py іске қосуға дайынсыз.")
