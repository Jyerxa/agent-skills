#!/usr/bin/env python3
"""Render a Process Model v1 as a portable, offline HTML explanation."""
from __future__ import annotations
import argparse
import hashlib
import html
import json
import re
import sys
from pathlib import Path
from validate_model import FIELD, HEADING, LINK, validate

ROOT = Path(__file__).resolve().parents[1]


def parse_model(text: str) -> dict:
    original = text
    text = text.replace("\r\n", "\n")
    errors = validate(text)
    if errors:
        raise ValueError("Invalid model:\n" + "\n".join(errors))
    end = text.index("\n---\n", 4)
    meta = {}
    for line in text[4:end].splitlines():
        if line.strip() and not line.lstrip().startswith("#"):
            key, value = line.split(":", 1)
            meta[key.strip()] = value.strip().strip("\"'")
    visible = re.sub(r"^```[^\n]*\n.*?^```\s*$", "", text[end + 5:],
                     flags=re.M | re.S)
    headings = list(HEADING.finditer(visible))
    records = []
    for index, heading in enumerate(headings):
        stop = headings[index + 1].start() if index + 1 < len(headings) else len(visible)
        section = re.split(r"^#{1,2} ", visible[heading.end():stop], maxsplit=1, flags=re.M)[0]
        fields, current = {}, None
        for line in section.splitlines():
            match = FIELD.match(line)
            if match:
                current, value = match.groups()
                fields[current] = value.strip()
            elif current and line.startswith((" ", "\t")):
                fields[current] += " " + line.strip()
            elif line.strip():
                current = None
        records.append({"id": heading.group(1), "fields": fields})
    title = re.search(r"^# (.+)$", visible, re.M)
    return {"meta": meta, "title": title.group(1) if title else meta["model_id"],
            "sha256": hashlib.sha256(original.encode("utf-8")).hexdigest(),
            "records": records, "source": original,
            "intro": visible[:headings[0].start()].strip()}


def unique(values):
    return list(dict.fromkeys(values))


def default_view(model: dict) -> dict:
    records = {r["id"]: r["fields"] for r in model["records"]}
    scenarios = []
    for rid, fields in records.items():
        if fields["Kind"] != "scenario":
            continue
        # Link order is a reading order only. Never infer a business trace.
        focus = unique(x for x in LINK.findall(fields["Meaning"])
                       if records[x]["Kind"] in {"action", "event", "state", "rule"})
        scenarios.append({"id": rid, "mode": "guided-reading", "frames": [
            {"focus": [x], "basis": [{"id": rid, "field": "Meaning"}]} for x in focus
        ] or [{"focus": [rid], "basis": [{"id": rid, "field": "Meaning"}]}]})
    return {"format": "process-view/v1", "model_id": model["meta"]["model_id"],
            "revision": int(model["meta"]["revision"]), "sha256": model["sha256"],
            "scenarios": scenarios, "edges": []}


def validate_view(view: dict, model: dict) -> None:
    records = {r["id"]: r["fields"] for r in model["records"]}
    def require(ok, message):
        if not ok:
            raise ValueError(message)
    require(isinstance(view, dict), "View must be a JSON object.")
    require(set(view) <= {"format", "model_id", "revision", "sha256", "scenarios", "edges"},
            "Unknown view keys: this renderer does not accept proposal inputs.")
    for key, expected in (("format", "process-view/v1"), ("model_id", model["meta"]["model_id"]),
                          ("revision", int(model["meta"]["revision"])), ("sha256", model["sha256"])):
        require(view.get(key) == expected, f"View {key} does not match its exact baseline.")
    def basis_check(basis):
        require(isinstance(basis, list) and bool(basis), "Every visual assertion needs field-level basis.")
        for point in basis:
            require(isinstance(point, dict) and set(point) == {"id", "field"}, "Invalid basis pointer.")
            require(point["id"] in records and point["field"] in records[point["id"]],
                    "Unresolved basis record or field.")
            require(records[point["id"]]["Kind"] != "source", "Use a model assertion as basis, not just a source locator.")
    scenarios = view.get("scenarios", [])
    require(isinstance(scenarios, list), "scenarios must be a list.")
    seen = set()
    for scenario in scenarios:
        require(isinstance(scenario, dict) and set(scenario) == {"id", "mode", "frames"}, "Invalid scenario view keys.")
        sid = scenario["id"]
        require(sid in records and records[sid]["Kind"] == "scenario" and sid not in seen, "Invalid or duplicate scenario ID.")
        seen.add(sid)
        require(scenario["mode"] in {"guided-reading", "case-trace"}, "Unknown scenario mode.")
        frames = scenario["frames"]
        require(isinstance(frames, list) and bool(frames), "A scenario needs at least one frame.")
        for frame in frames:
            require(isinstance(frame, dict) and set(frame) == {"focus", "basis"}, "Invalid frame keys.")
            require(isinstance(frame["focus"], list) and bool(frame["focus"]), "A frame needs focus IDs.")
            require(len(frame["focus"]) == len(set(frame["focus"])), "Duplicate focus ID.")
            for rid in frame["focus"]:
                require(rid in records and records[rid]["Kind"] != "source", "Unknown focus ID or source-only frame.")
            basis_check(frame["basis"])
            if scenario["mode"] == "case-trace":
                require(len(frame["focus"]) == 1, "Case traces support one established event/action per frame; no inferred concurrency.")
                require(records[frame["focus"][0]]["Kind"] in {"action", "event"}, "Case traces contain actions/events only.")
                require({"id": sid, "field": "Meaning"} in frame["basis"], "Case trace needs scenario Meaning as sequence evidence.")
                require(frame["focus"][0] in LINK.findall(records[sid]["Meaning"]), "Trace action must occur in its scenario account.")
    # Missing scenarios remain present as guided readings, never silently disappear.
    edges = view.get("edges", [])
    require(isinstance(edges, list), "edges must be a list.")
    for edge in edges:
        require(isinstance(edge, dict) and set(edge) == {"from", "to", "relation", "basis"}, "Invalid edge keys.")
        for key in ("from", "to"):
            require(edge[key] in records and records[edge[key]]["Kind"] != "source", "Unknown edge endpoint.")
        require(isinstance(edge["relation"], str) and bool(edge["relation"].strip()), "An edge needs an explicit relation label.")
        basis_check(edge["basis"])


def build_data(text: str, view: dict | None = None) -> dict:
    model = parse_model(text)
    defaults = default_view(model)
    if view is None:
        view = defaults
    validate_view(view, model)
    selected = {s["id"]: s for s in view.get("scenarios", [])}
    model["scenarios"] = [selected.get(s["id"], s) for s in defaults["scenarios"]]
    model["edges"] = list(view.get("edges", []))
    for record in model["records"]:
        fields = record["fields"]
        if fields["Kind"] == "relationship":
            model["edges"].append({"from": LINK.findall(fields["From"])[0],
                "to": LINK.findall(fields["To"])[0], "relation": fields["Relation"],
                "basis": [{"id": record["id"], "field": "Meaning"}]})
    return model


def render(text: str, view: dict | None = None) -> str:
    data = build_data(text, view)
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    # JSON inside a script element still needs HTML-context escaping.
    payload = payload.replace("&", "\\u0026").replace("<", "\\u003c").replace(">", "\\u003e")
    payload = payload.replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
    template = (ROOT / "assets" / "viewer.html").read_text(encoding="utf-8")
    return template.replace("__TITLE__", html.escape(data["title"])).replace("__MODEL_DATA__", payload)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("model", type=Path)
    parser.add_argument("--view", type=Path, help="Optional derived, revision-pinned presentation plan.")
    parser.add_argument("--output", type=Path, help="Output HTML file.")
    parser.add_argument("--write-view", type=Path, help="Write an editable derived reading plan; no inferred trace.")
    args = parser.parse_args()
    try:
        text = args.model.read_bytes().decode("utf-8")
        if not (args.output or args.write_view):
            parser.error("use --output and/or --write-view")
        view = json.loads(args.view.read_text(encoding="utf-8")) if args.view else None
        data = build_data(text, view)
        if args.write_view:
            args.write_view.write_text(json.dumps(default_view(data), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        if args.output:
            args.output.write_text(render(text, view), encoding="utf-8")
            print(f"Wrote {args.output}: {data['meta']['model_id']} r{data['meta']['revision']}; {len(data['records'])} records.")
        return 0
    except (OSError, ValueError, TypeError, KeyError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
