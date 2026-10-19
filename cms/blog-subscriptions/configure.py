#!/usr/bin/env python3
"""Configure root-owned runtime files. Secrets are read from stdin, never argv."""
import grp
import os
from pathlib import Path
import re
import secrets
import sys
import tempfile


def read_env(path):
    result = {}
    for line in path.read_text().splitlines():
        match = re.match(r"^([A-Z][A-Z0-9_]*)=(.*)$", line)
        if match:
            result[match[1]] = match[2].strip().strip("\"'")
    return result


def update_env(path, values, group, mode):
    lines = path.read_text().splitlines()
    output = []
    remaining = dict(values)
    for line in lines:
        key = line.partition("=")[0]
        if key in values:
            if key in remaining:
                output.append(f"{key}={remaining.pop(key)}")
        else:
            output.append(line)
    output.extend(f"{key}={value}" for key, value in remaining.items())
    fd, temporary = tempfile.mkstemp(prefix=".blog-env-", dir=path.parent)
    try:
        os.fchmod(fd, mode)
        os.fchown(fd, 0, grp.getgrnam(group).gr_gid)
        with os.fdopen(fd, "w") as stream:
            stream.write("\n".join(output) + "\n")
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


if __name__ == "__main__":
    if os.geteuid() != 0:
        raise SystemExit("Run as root.")
    cms = Path("/opt/strapi/.env")
    portfolio = Path("/etc/portfolio.env")
    existing = read_env(cms)
    print("Waiting for Send API key on stdin; input is not echoed.", flush=True)
    token = sys.stdin.readline().strip()
    if not token.startswith("Zoho-enczapikey ") or len(token) < 70 or any(c in token for c in "\r\n\"'"):
        raise SystemExit("Invalid Send API key format.")
    internal = existing.get("BLOG_SUBSCRIPTIONS_INTERNAL_SECRET") or secrets.token_hex(32)
    update_env(cms, {
        "BLOG_SUBSCRIPTIONS_ENABLED": "false",
        "BLOG_SUBSCRIPTIONS_INTERNAL_SECRET": internal,
        "BLOG_SUBSCRIPTIONS_SIGNING_SECRET": existing.get("BLOG_SUBSCRIPTIONS_SIGNING_SECRET") or secrets.token_hex(32),
        "BLOG_SUBSCRIPTIONS_WEBHOOK_SECRET": existing.get("BLOG_SUBSCRIPTIONS_WEBHOOK_SECRET") or secrets.token_hex(32),
        "BLOG_SUBSCRIPTIONS_FROM": "blog@deiondz.com",
        "BLOG_SUBSCRIPTIONS_REPLY_TO": "deiondsouza12@gmail.com",
        "ZEPTOMAIL_URL": "https://cpaas.zoho.in/v1.1/email",
        "ZEPTOMAIL_TOKEN": token,
    }, "strapi", 0o640)
    update_env(portfolio, {
        "BLOG_SUBSCRIPTIONS_INTERNAL_SECRET": internal,
        "STRAPI_INTERNAL_URL": "http://127.0.0.1:1337",
    }, "root", 0o600)
    print("Runtime configuration saved. Sending remains disabled. No secret values were printed.")
