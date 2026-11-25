"""Transactional email via Brevo's HTTPS API (works on hosts that block SMTP ports)."""
from __future__ import annotations

import html
import logging

import httpx

from .config import BREVO_API_KEY, MAIL_FROM, MAIL_FROM_NAME

log = logging.getLogger("mail")
BREVO_URL = "https://api.brevo.com/v3/smtp/email"


def mail_configured() -> bool:
    return bool(BREVO_API_KEY and MAIL_FROM)


async def send_email(to: str, subject: str, html_body: str, text_body: str) -> bool:
    """Send one email. Returns False (and logs why) instead of raising, so callers never leak errors."""
    if not mail_configured():
        log.warning("Email not configured (BREVO_API_KEY / MAIL_FROM). Message for %s:\n%s", to, text_body)
        return False
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(15, connect=8)) as client:
            resp = await client.post(
                BREVO_URL,
                headers={"api-key": BREVO_API_KEY, "accept": "application/json", "content-type": "application/json"},
                json={"sender": {"name": MAIL_FROM_NAME, "email": MAIL_FROM}, "to": [{"email": to}],
                      "subject": subject, "htmlContent": html_body, "textContent": text_body},
            )
    except httpx.HTTPError as e:
        log.warning("Email to %s failed: network error (%s)", to, type(e).__name__)
        return False
    if resp.status_code >= 300:
        log.warning("Email to %s failed: Brevo %s %s", to, resp.status_code, resp.text[:200])
        return False
    return True


def reset_email(name: str, link: str, minutes: int) -> tuple[str, str, str]:
    """(subject, html, text) for the password reset email, in Thai and English."""
    n = html.escape(name or "")
    subject = "รีเซ็ตรหัสผ่าน Palettai · Reset your Palettai password"
    text = (
        f"สวัสดี {name},\n\nกดลิงก์นี้เพื่อตั้งรหัสผ่านใหม่ (ใช้ได้ {minutes} นาที และใช้ได้ครั้งเดียว):\n{link}\n\n"
        f"Hi {name},\n\nUse this link to set a new password (valid for {minutes} minutes, one use only):\n{link}\n\n"
        "ถ้าคุณไม่ได้ขอรีเซ็ตรหัสผ่าน ไม่ต้องทำอะไร · If you didn't ask for this, you can ignore this email."
    )
    body = f"""<!doctype html><html><body style="margin:0;background:#FBF8F3;font-family:Arial,'Tahoma',sans-serif;color:#17151F">
<div style="max-width:480px;margin:0 auto;padding:32px 20px">
  <p style="font-size:22px;font-weight:800;margin:0 0 24px">Palett<span style="color:#FF5A36">ai</span> ✦</p>
  <div style="background:#fff;border-radius:18px;padding:28px;border:1px solid #eee">
    <p style="font-size:16px;margin:0 0 6px">สวัสดี {n} 👋</p>
    <p style="margin:0 0 18px;color:#555">กดปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่<br>Tap the button to set a new password.</p>
    <a href="{html.escape(link)}" style="display:inline-block;background:#FF5A36;color:#fff;text-decoration:none;
       font-weight:700;padding:14px 24px;border-radius:14px">ตั้งรหัสผ่านใหม่ · Reset password</a>
    <p style="margin:18px 0 0;font-size:12px;color:#888">ลิงก์ใช้ได้ {minutes} นาที และใช้ได้ครั้งเดียว · Valid for {minutes} minutes, one use only.</p>
  </div>
  <p style="font-size:12px;color:#999;margin-top:18px">ถ้าคุณไม่ได้ขอรีเซ็ตรหัสผ่าน ไม่ต้องทำอะไร<br>If you didn't ask for this, you can ignore this email.</p>
</div></body></html>"""
    return subject, body, text
