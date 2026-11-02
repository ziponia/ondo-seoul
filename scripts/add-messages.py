# 개발 도우미 — messages/ko.json에 키를 더한다(이미 있으면 덮어쓴다). 사용: python3 scripts/add-messages.py '{"key":"문구"}'
import json, sys
path = "messages/ko.json"
data = json.load(open(path))
data.update(json.loads(sys.argv[1]))
schema = data.pop("$schema")
ordered = {"$schema": schema, **dict(sorted(data.items()))}
open(path, "w").write(json.dumps(ordered, ensure_ascii=False, indent=2) + "\n")
