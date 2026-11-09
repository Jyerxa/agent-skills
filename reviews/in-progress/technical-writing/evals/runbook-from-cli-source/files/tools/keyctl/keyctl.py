#!/usr/bin/env python3
"""keyctl: manage the webhook signing key.

The webhook-sender service reads the active key from the vault and polls for
changes every 5 minutes. During the grace window both the new and previous
keys verify signatures, so partners have time to pick up the new key.
"""
import argparse
import json
import os
import secrets
import sys
from datetime import datetime, timedelta, timezone

STATE = os.environ.get("KEYCTL_STATE", os.path.expanduser("~/.keyctl-state.json"))
MAX_GRACE_HOURS = 72


def load():
    try:
        with open(STATE) as f:
            return json.load(f)
    except FileNotFoundError:
        return {env: {"active": "wk_" + env[:4] + "0001", "previous": None, "grace_until": None}
                for env in ("staging", "prod")}


def save(state):
    with open(STATE, "w") as f:
        json.dump(state, f, indent=2)


def now():
    return datetime.now(timezone.utc).replace(microsecond=0)


def in_grace(entry):
    return entry["grace_until"] and datetime.fromisoformat(entry["grace_until"]) > now()


def cmd_status(args, state):
    e = state[args.env]
    print(f"env:       {args.env}")
    print(f"active:    {e['active']}")
    if in_grace(e):
        print(f"previous:  {e['previous']} (valid until {e['grace_until']})")
    else:
        print("previous:  none")
    return 0


def cmd_rotate(args, state):
    if args.env == "prod" and args.confirm != "prod":
        print("error: refusing to rotate prod without --confirm prod", file=sys.stderr)
        return 2
    if not 1 <= args.grace_hours <= MAX_GRACE_HOURS:
        print(f"error: --grace-hours must be between 1 and {MAX_GRACE_HOURS}", file=sys.stderr)
        return 2
    e = state[args.env]
    if in_grace(e):
        print(f"error: rotation already in progress for {args.env} "
              f"(previous key {e['previous']} valid until {e['grace_until']}); "
              f"run 'keyctl status --env {args.env}'", file=sys.stderr)
        return 4
    new_key = "wk_" + secrets.token_hex(4)
    until = (now() + timedelta(hours=args.grace_hours)).isoformat()
    if args.dry_run:
        print(f"dry run: would activate {new_key}; {e['active']} would stay valid until {until}")
        return 0
    state[args.env] = {"active": new_key, "previous": e["active"], "grace_until": until}
    save(state)
    print(f"Rotation scheduled: {new_key} is active; {e['active']} stays valid until {until}")
    print("webhook-sender picks up the new key within 5 minutes.")
    return 0


def cmd_revert(args, state):
    e = state[args.env]
    if not in_grace(e):
        print(f"error: no previous key to revert to for {args.env}; the grace window has ended",
              file=sys.stderr)
        return 5
    if args.to != e["previous"]:
        print(f"error: --to must be the previous key ({e['previous']})", file=sys.stderr)
        return 2
    state[args.env] = {"active": e["previous"], "previous": None, "grace_until": None}
    save(state)
    print(f"Reverted: {e['previous']} is active again; {e['active']} is revoked")
    return 0


def main(argv=None):
    p = argparse.ArgumentParser(prog="keyctl", description="Manage the webhook signing key.")
    sub = p.add_subparsers(dest="command", required=True)
    for name in ("status", "rotate", "revert"):
        s = sub.add_parser(name)
        s.add_argument("--env", choices=["staging", "prod"], required=True)
        if name == "rotate":
            s.add_argument("--grace-hours", type=int, default=24,
                           help="hours the previous key stays valid (1-72, default 24)")
            s.add_argument("--dry-run", action="store_true", help="show what would change")
            s.add_argument("--confirm", help="required for prod: --confirm prod")
        if name == "revert":
            s.add_argument("--to", required=True, help="previous key ID, from 'keyctl status'")
    args = p.parse_args(argv)
    if not os.environ.get("KEYCTL_TOKEN"):
        print("error: KEYCTL_TOKEN is not set; get a token with 'vault login -method=oidc'",
              file=sys.stderr)
        return 3
    state = load()
    return {"status": cmd_status, "rotate": cmd_rotate, "revert": cmd_revert}[args.command](args, state)


if __name__ == "__main__":
    sys.exit(main())
