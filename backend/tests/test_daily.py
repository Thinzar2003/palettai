from datetime import date, datetime

from app.daily import _childrens_day, context, context_text, events_on, upcoming


def test_childrens_day_is_second_saturday():
    assert _childrens_day(2027) == date(2027, 1, 9)
    assert _childrens_day(2026) == date(2026, 1, 10)


def test_paydays_and_events():
    assert [e["kind"] for e in events_on(date(2026, 11, 25))] == ["payday"]
    assert [e["name_en"] for e in events_on(date(2026, 11, 30))] == ["Payday (end of month)"]
    assert "Father's Day" in [e["name_en"] for e in events_on(date(2026, 12, 5))]
    assert len([e for e in upcoming(date(2027, 4, 10), 10) if e["name_en"] == "Songkran"]) == 1  # 3 days → once


def test_context_uses_bangkok_time():
    # 2026-11-24 23:30 UTC is already 25 Nov 06:30 in Bangkok
    ctx = context(datetime.fromisoformat("2026-11-24T23:30:00+00:00"))
    assert ctx["date"] == "2026-11-25" and ctx["weekday"] == "Wednesday" and ctx["weekday_th"] == "วันพุธ"
    assert ctx["part_of_day"] == "morning" and ctx["days_to_payday"] == 0 and ctx["today"]
    assert ctx["upcoming"][0]["name_en"].startswith("Payday") and ctx["upcoming"][0]["days_until"] == 5
    text = context_text(ctx)
    assert "Wednesday 25 November 2026" in text and "Father's Day in 10 days" in text


def test_parts_of_day_in_bangkok():
    at = lambda utc: context(datetime.fromisoformat(utc))
    assert at("2026-11-25T03:00:00+00:00")["part_of_day"] == "morning"     # 10:00 BKK
    assert at("2026-11-25T07:00:00+00:00")["part_of_day"] == "afternoon"   # 14:00 BKK
    assert at("2026-11-25T12:00:00+00:00")["part_of_day"] == "evening"     # 19:00 BKK
    assert at("2026-11-25T16:30:00+00:00")["part_of_day"] == "night"       # 23:30 BKK
    late = at("2026-11-24T19:00:00+00:00")                                  # 02:00 BKK, already the 25th
    assert late["part_of_day"] == "night" and late["date"] == "2026-11-25"
