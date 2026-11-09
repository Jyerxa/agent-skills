#!/usr/bin/env python3
"""exportctl: inspect and repair customer data export jobs."""
import argparse
import sys

DEFAULT_OLDER_THAN_HOURS = 6


def main(argv=None):
    p = argparse.ArgumentParser(prog="exportctl", allow_abbrev=False)
    sub = p.add_subparsers(dest="command", required=True)
    ls = sub.add_parser("list", help="list export jobs")
    ls.add_argument("--stuck", action="store_true", help="only jobs with no progress")
    ls.add_argument("--older-than", type=int, default=DEFAULT_OLDER_THAN_HOURS,
                    help="hours without progress before a job counts as stuck (default 6)")
    ls.add_argument("--match", help="job name to match exactly; no wildcards")
    rt = sub.add_parser("retry", help="restart a stuck job from its last checkpoint")
    rt.add_argument("job_id")
    cn = sub.add_parser("cancel", help="cancel a job")
    cn.add_argument("job_id")
    cn.add_argument("--purge", action="store_true",
                    help="also delete the job's partial files from the export bucket; cannot be undone")
    args = p.parse_args(argv)
    print(f"(fixture) would run {args.command}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
