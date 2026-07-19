#!/usr/bin/env python3
"""
Export all first-timer records from the Waypoint API to a CSV file.
Edit the settings below, then run: python export_first_timers.py
"""

import csv
import os
import requests

BASE_URL = os.environ.get("WAYPOINT_BASE_URL", "http://localhost:5000")
EMAIL = os.environ.get("WAYPOINT_EMAIL", "")
PASSWORD = os.environ.get("WAYPOINT_PASSWORD", "")
OUT_FILE = "first_timers.csv"

if not EMAIL or not PASSWORD:
    raise SystemExit("Set WAYPOINT_EMAIL and WAYPOINT_PASSWORD environment variables before running this script.")

# 1. Log in to get an access token
login_resp = requests.post(
    f"{BASE_URL}/api/v1/auth/token",
    json={"email": EMAIL, "password": PASSWORD},
)
login_body = login_resp.json()
if not login_body["success"]:
    raise SystemExit(f"Login failed: {login_body['message']}")

token = login_body["data"]["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# 2. Page through /api/v1/first-timers until there's nothing left
all_records = []
page = 1

while True:
    resp = requests.get(
        f"{BASE_URL}/api/v1/first-timers",
        headers=headers,
        params={"page": page, "limit": 200},
    )
    body = resp.json()
    if not body["success"]:
        raise SystemExit(f"Request failed: {body['message']}")

    all_records.extend(body["data"])

    if page >= body["meta"]["total_pages"]:
        break
    page += 1

print(f"Fetched {len(all_records)} first-timer records")

# 3. Write to CSV
if all_records:
    with open(OUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=all_records[0].keys())
        writer.writeheader()
        writer.writerows(all_records)
    print(f"Saved to {OUT_FILE}")
