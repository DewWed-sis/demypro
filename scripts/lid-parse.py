"""Тексты вопросов из официального Gesamtfragenkatalog BAMF (PDF, Stand 07.05.2025).
Варианты ответов и верный ответ — из официального тестцентра oet.bamf.de (там вопрос — картинка, ответы — текст).
Запуск: uv run --with pypdf python -I scripts/lid-parse.py katalog.pdf questions.json"""
import json, re, sys
from pypdf import PdfReader

pages = [p.extract_text() or "" for p in PdfReader(sys.argv[1]).pages]
NOISE = re.compile(r"^(Seite \d+ von \d+|Teil I+|Allgemeine Fragen|Frag|en für das Bundesland .*|(Bild \d ?)+)$")

def questions(page_range, offset):
    text = "\n".join(f"\n@@PAGE {i + 1}\n" + pages[i] for i in page_range)
    text = re.sub(r"A\s*u\s*f\s*g\s*a\s*b\s*e\s+(\d+)", r"\nAufgabe \1\n", re.sub(r"A\n?uf\n?gabe", "Aufgabe", text))
    out, cur, page = {}, None, 0
    for raw in text.split("\n"):
        line = raw.strip()
        if line.startswith("@@PAGE"):
            page = int(line.split()[1]); continue
        m = re.fullmatch(r"Aufgabe (\d+)", line)
        if m:
            n = int(m.group(1)) + offset
            if n in out: break  # следующий Bundesland начинается снова с 1
            cur = out[n] = {"n": n, "question": "", "page": page, "open": True}; continue
        if not cur or not cur["open"] or not line or NOISE.match(line): continue
        if line[0] in "□": cur["open"] = False; continue
        cur["question"] = re.sub(r"^\d+\.\s*", "", (cur["question"] + " " + line).strip())
    return list(out.values())

first_ii = next(i for i, t in enumerate(pages) if "Teil II" in t)
nrw = next(i for i, t in enumerate(pages) if "Bundesland Nordrhein-Westfalen" in t and "Teil II" in t)
qs = questions(range(1, first_ii), 0) + [q for q in questions(range(nrw, nrw + 5), 300) if q["n"] <= 310]
for q in qs:
    del q["open"]
    # выделенные в PDF слова разбиты пробелом: «nicht i m», «zu r gesetzlichen»
    t = re.sub(r"\bzu r ", "zur ", q["question"]).replace("deu tsche", "deutsche").replace("wä hrend", "während")
    t = re.sub(r"\b([a-zA-ZäöüÄÖÜ]) ([a-zäöüß]+)\b", r"\1\2", t)
    q["question"] = re.sub(r"\s{2,}", " ", t)
print("total", len(qs), "missing", sorted(set(range(1, 311)) - {q["n"] for q in qs}), "empty", [q["n"] for q in qs if len(q["question"]) < 8])
json.dump(qs, open(sys.argv[2], "w"), ensure_ascii=False, indent=1)
