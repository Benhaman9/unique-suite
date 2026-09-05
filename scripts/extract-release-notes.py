#!/usr/bin/env python3
from pathlib import Path
import os
tag = os.environ.get("GITHUB_REF_NAME", "")
text = Path("CHANGELOG.md").read_text(encoding="utf-8")
lines = text.splitlines()
start = None
for i, line in enumerate(lines):
    if line.strip() == f"## {tag}":
        start = i
        break
if start is None:
    body = f"Unique Suite {tag}\n\nSee CHANGELOG.md for details.\n"
else:
    chunk = []
    for line in lines[start + 1:]:
        if line.startswith("## "):
            break
        chunk.append(line)
    body = f"## {tag}\n" + "\n".join(chunk).strip() + "\n"
Path("release-notes.md").write_text(body, encoding="utf-8")
print(body)
