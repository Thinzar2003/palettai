"""Today's context for daily tools: Bangkok date, weekday, payday and Thai calendar events.

Only fixed-date (or rule-based) events are listed. Lunar holidays such as Loy Krathong and
Songkran-adjacent Buddhist days move every year, so they're left out rather than guessed.
"""
from __future__ import annotations

import calendar
from datetime import date, datetime, timedelta, timezone

BKK = timezone(timedelta(hours=7))  # Thailand has no daylight saving time

WEEKDAYS_TH = ["วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์", "วันอาทิตย์"]

# (month, day, English, Thai, kind)
FIXED_EVENTS = [
    (1, 1, "New Year's Day", "วันขึ้นปีใหม่", "holiday"),
    (1, 16, "Teachers' Day", "วันครู", "observance"),
    (2, 14, "Valentine's Day", "วันวาเลนไทน์", "observance"),
    (4, 13, "Songkran", "วันสงกรานต์", "holiday"),
    (4, 14, "Songkran", "วันสงกรานต์", "holiday"),
    (4, 15, "Songkran", "วันสงกรานต์", "holiday"),
    (6, 3, "Queen's Birthday", "วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี", "holiday"),
    (7, 28, "King's Birthday", "วันเฉลิมพระชนมพรรษา", "holiday"),
    (8, 12, "Mother's Day", "วันแม่แห่งชาติ", "holiday"),
    (9, 9, "9.9 Shopping Day", "9.9 วันช้อปปิ้ง", "sale"),
    (10, 10, "10.10 Shopping Day", "10.10 วันช้อปปิ้ง", "sale"),
    (10, 23, "Chulalongkorn Day", "วันปิยมหาราช", "holiday"),
    (10, 31, "Halloween", "ฮาโลวีน", "observance"),
    (11, 11, "11.11 Shopping Day", "11.11 วันช้อปปิ้ง", "sale"),
    (12, 5, "Father's Day", "วันพ่อแห่งชาติ", "holiday"),
    (12, 10, "Constitution Day", "วันรัฐธรรมนูญ", "holiday"),
    (12, 12, "12.12 Shopping Day", "12.12 วันช้อปปิ้ง", "sale"),
    (12, 25, "Christmas", "คริสต์มาส", "observance"),
    (12, 31, "New Year's Eve", "วันสิ้นปี", "observance"),
]


def today_bkk(now: datetime | None = None) -> date:
    return (now or datetime.now(BKK)).astimezone(BKK).date()


def _childrens_day(year: int) -> date:
    """Second Saturday of January."""
    d = date(year, 1, 1)
    first_sat = d + timedelta(days=(5 - d.weekday()) % 7)
    return first_sat + timedelta(days=7)


def events_on(d: date) -> list[dict]:
    out = [dict(name_en=en, name_th=th, kind=k) for (m, day, en, th, k) in FIXED_EVENTS if (m, day) == (d.month, d.day)]
    if d == _childrens_day(d.year):
        out.append(dict(name_en="Children's Day", name_th="วันเด็กแห่งชาติ", kind="observance"))
    last = calendar.monthrange(d.year, d.month)[1]
    if d.day == 25:
        out.append(dict(name_en="Payday (25th)", name_th="วันเงินเดือนออก (25)", kind="payday"))
    elif d.day == last:
        out.append(dict(name_en="Payday (end of month)", name_th="วันเงินเดือนออก (สิ้นเดือน)", kind="payday"))
    return out


def upcoming(start: date, days: int = 21) -> list[dict]:
    items = []
    seen = set()
    for i in range(days + 1):
        d = start + timedelta(days=i)
        for ev in events_on(d):
            key = (ev["name_en"], d.year)
            if ev["kind"] != "payday" and key in seen:  # Songkran spans 3 days: list it once
                continue
            seen.add(key)
            items.append({**ev, "date": d.isoformat(), "days_until": i})
    return items


def context(now: datetime | None = None) -> dict:
    d = today_bkk(now)
    hour = (now or datetime.now(BKK)).astimezone(BKK).hour
    part = "morning" if hour < 12 else "afternoon" if hour < 17 else "evening"
    nxt = upcoming(d, 21)
    pay = next((e["days_until"] for e in nxt if e["kind"] == "payday"), None)
    return {
        "date": d.isoformat(),
        "weekday": d.strftime("%A"),
        "weekday_th": WEEKDAYS_TH[d.weekday()],
        "pretty": d.strftime("%A %d %B %Y"),
        "part_of_day": part,
        "is_weekend": d.weekday() >= 5,
        "days_to_payday": pay,
        "today": [e for e in nxt if e["days_until"] == 0],
        "upcoming": [e for e in nxt if e["days_until"] > 0][:6],
    }


def context_text(ctx: dict) -> str:
    """Short plain-English summary for AI prompts."""
    parts = [f"Today is {ctx['pretty']} in Thailand ({'weekend' if ctx['is_weekend'] else 'weekday'}, {ctx['part_of_day']})."]
    if ctx["today"]:
        parts.append("Today: " + ", ".join(e["name_en"] for e in ctx["today"]) + ".")
    if ctx["upcoming"]:
        parts.append("Coming up: " + ", ".join(f"{e['name_en']} in {e['days_until']} days" for e in ctx["upcoming"][:4]) + ".")
    return " ".join(parts)
