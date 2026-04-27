"""
Sync the single project config (`config/config.json`) to frontend `public/config.json`
and update `.env` with `VITE_API_URL` so the frontend dev server uses the same base.

Run this script after editing `config/config.json`:

  python scripts/sync_config.py

It will:
- write `public/config.json` (overwriting if present)
- update or add `VITE_API_URL` in the workspace `.env`
"""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parent.parent
CONFIG_SRC = ROOT / 'config' / 'config.json'
PUBLIC_CONFIG = ROOT / 'public' / 'config.json'
ENV_FILE = ROOT / '.env'

def load_config():
    if not CONFIG_SRC.exists():
        raise SystemExit(f"Config source not found: {CONFIG_SRC}")
    with open(CONFIG_SRC, 'r', encoding='utf-8') as f:
        return json.load(f)

def write_public_config(cfg):
    PUBLIC_CONFIG.parent.mkdir(parents=True, exist_ok=True)
    with open(PUBLIC_CONFIG, 'w', encoding='utf-8') as f:
        json.dump(cfg, f, indent=2)
    print(f"Wrote {PUBLIC_CONFIG}")

def update_env(cfg):
    vite_url = cfg.get('API_BASE') or cfg.get('BASE_URL')
    if vite_url and vite_url.endswith('/api'):
        vite_var = vite_url
    elif vite_url:
        vite_var = f"{vite_url}/api"
    else:
        vite_var = 'http://localhost:8000/api'

    lines = []
    if ENV_FILE.exists():
        with open(ENV_FILE, 'r', encoding='utf-8') as f:
            lines = f.read().splitlines()

    key = 'VITE_API_URL'
    found = False
    new_lines = []
    for line in lines:
        if line.strip().startswith(f"{key}="):
            new_lines.append(f"{key}={vite_var}")
            found = True
        else:
            new_lines.append(line)

    if not found:
        new_lines.insert(0, f"{key}={vite_var}")

    with open(ENV_FILE, 'w', encoding='utf-8') as f:
        f.write('\n'.join(new_lines) + '\n')

    print(f"Updated {ENV_FILE} with {key}={vite_var}")

def main():
    cfg = load_config()
    write_public_config(cfg)
    update_env(cfg)

if __name__ == '__main__':
    main()
