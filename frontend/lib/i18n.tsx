"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Lang = "en" | "th";
const STORE_KEY = "palettai.lang";

/**
 * Interface translations. The key is the English text itself, so any string without a
 * Thai entry simply shows in English (safe default while more screens get translated).
 * Use {name} placeholders for values: t("In {n} days", { n: 3 }).
 */
const TH: Record<string, string> = {
  // nav / account
  "Today": "วันนี้",
  "My brands": "แบรนด์ของฉัน",
  "+ New brand": "+ แบรนด์ใหม่",
  "Log in": "เข้าสู่ระบบ",
  "Log out": "ออกจากระบบ",
  "Sign up free": "สมัครฟรี",
  "{n}/{max} today": "ใช้ไป {n}/{max} วันนี้",
  "AI generations used in the last 24 hours": "จำนวนครั้งที่ใช้ AI ใน 24 ชั่วโมงที่ผ่านมา",
  "Create your account": "สร้างบัญชีของคุณ",
  "Your name": "ชื่อของคุณ",
  "Email": "อีเมล",
  "Password": "รหัสผ่าน",
  "At least 8 characters": "อย่างน้อย 8 ตัวอักษร",
  "Create account": "สร้างบัญชี",
  "Please wait…": "กรุณารอสักครู่…",
  "Already have an account? ": "มีบัญชีอยู่แล้ว? ",
  "New here? ": "ยังไม่มีบัญชี? ",
  "Create an account": "สร้างบัญชี",
  "Create a free account to save brands, track versions and share them with clients.":
    "สมัครฟรีเพื่อบันทึกแบรนด์ ดูประวัติเวอร์ชัน และแชร์ให้ลูกค้าได้",
  "Welcome back. Your brands are waiting for you.": "ยินดีต้อนรับกลับมา แบรนด์ของคุณรออยู่แล้ว",

  // today screen
  "What shall we post today?": "วันนี้จะโพสต์อะไรดี?",
  "Time for an afternoon post?": "โพสต์ช่วงบ่ายกันไหม?",
  "Anything to share tonight?": "คืนนี้มีอะไรอยากแชร์ไหม?",
  "Let's plan tomorrow's post, then rest 😴": "วางแผนโพสต์พรุ่งนี้ แล้วไปพักผ่อนนะ 😴",
  "Today's post": "โพสต์วันนี้",
  "A ready post with caption, in one tap": "โพสต์พร้อมแคปชันในคลิกเดียว",
  "Promo maker": "ทำโปรโมชัน",
  "Poster, story, Facebook & LINE message": "โปสเตอร์ สตอรี่ ข้อความ Facebook และ LINE",
  "Reply helper": "ช่วยตอบลูกค้า",
  "Answer reviews and chats nicely": "ตอบรีวิวและแชทอย่างสุภาพ",
  "Recently made": "ที่ทำล่าสุด",
  "tap to open": "แตะเพื่อเปิด",
  "Getting your day ready…": "กำลังเตรียมวันนี้ให้คุณ…",
  "Let's set up your brand first": "มาสร้างแบรนด์กันก่อน",
  "Your daily posts, promos and replies use your brand's colours, fonts and voice.":
    "โพสต์ โปรโมชัน และคำตอบในแต่ละวัน จะใช้สี ฟอนต์ และน้ำเสียงของแบรนด์คุณ",
  "Create my brand ✨": "สร้างแบรนด์ของฉัน ✨",
  "Tomorrow": "พรุ่งนี้",
  "In {n} days": "อีก {n} วัน",
  "tap for a post": "แตะเพื่อทำโพสต์",
  "Payday today: people are spending!": "วันนี้เงินเดือนออก คนพร้อมจับจ่าย!",
  "Tap for a payday post": "แตะเพื่อทำโพสต์วันเงินเดือนออก",
  "More events": "ดูเพิ่ม",
  "Previous events": "ย้อนกลับ",

  // tools
  "About: {event}": "เรื่อง: {event}",
  "remove": "ลบ",
  "Anything special today? (optional) e.g. new mango smoothie": "วันนี้มีอะไรพิเศษไหม? (ไม่บังคับ) เช่น เมนูใหม่ มะม่วงปั่น",
  "New menu item": "เมนูใหม่",
  "Behind the scenes": "เบื้องหลังร้าน",
  "Customer favourite": "เมนูขายดี",
  "Rainy-day special": "พิเศษวันฝนตก",
  "Thank our customers": "ขอบคุณลูกค้า",
  "Writing today's post…": "กำลังเขียนโพสต์วันนี้…",
  "↻ Make another": "↻ ทำอีกแบบ",
  "✨ Make today's post": "✨ ทำโพสต์วันนี้",
  "Thai caption": "แคปชันภาษาไทย",
  "English caption": "แคปชันภาษาอังกฤษ",
  "What's the offer? e.g. 20% off all milk tea": "โปรอะไรดี? เช่น ลด 20% ชานมทุกเมนู",
  "When? (optional) e.g. this weekend, 1–7 Dec": "ช่วงไหน? (ไม่บังคับ) เช่น เสาร์-อาทิตย์นี้, 1–7 ธ.ค.",
  "20% off everything": "ลด 20% ทุกเมนู",
  "Buy 1 get 1 free": "ซื้อ 1 แถม 1",
  "Free delivery over ฿300": "ส่งฟรีเมื่อซื้อครบ ฿300",
  "Today only": "วันนี้วันเดียว",
  "This weekend": "เสาร์-อาทิตย์นี้",
  "All this week": "ตลอดสัปดาห์นี้",
  "Until end of month": "ถึงสิ้นเดือน",
  "Describe your offer first, e.g. “20% off milk tea”.": "กรอกโปรโมชันก่อน เช่น “ลด 20% ชานม”",
  "Designing your promo…": "กำลังออกแบบโปรโมชัน…",
  "↻ Make another version": "↻ ทำอีกเวอร์ชัน",
  "🏷️ Make my promo": "🏷️ ทำโปรโมชัน",
  "Feed post · 1080×1080": "โพสต์ฟีด · 1080×1080",
  "Story · 1080×1920": "สตอรี่ · 1080×1920",
  "Facebook / Instagram caption": "แคปชัน Facebook / Instagram",
  "LINE message": "ข้อความ LINE",
  "Paste a customer review or chat message here…": "วางรีวิวหรือข้อความแชทของลูกค้าที่นี่…",
  "Google review": "รีวิว Google",
  "Other": "อื่น ๆ",
  "Paste the customer's message or review first.": "วางข้อความหรือรีวิวของลูกค้าก่อน",
  "Writing a reply…": "กำลังเขียนคำตอบ…",
  "💬 Write my reply": "💬 เขียนคำตอบ",
  "😊 Happy customer": "😊 ลูกค้าพอใจ",
  "😐 Neutral": "😐 เฉย ๆ",
  "😟 Unhappy customer": "😟 ลูกค้าไม่พอใจ",
  "❓ Question": "❓ คำถาม",
  "Reply": "คำตอบ",
  "friendlier": "เป็นกันเองขึ้น",
  "more formal": "ทางการขึ้น",
  "shorter": "สั้นลง",
  "Show other language": "ดูอีกภาษา",
  "Hide other language": "ซ่อนอีกภาษา",
  "Something went wrong": "เกิดข้อผิดพลาด",

  // sharing / editing
  "⤓ Save image": "⤓ บันทึกรูป",
  "↗ Share": "↗ แชร์",
  "⧉ Copy caption": "⧉ คัดลอกแคปชัน",
  "⧉ Copy": "⧉ คัดลอก",
  "Copied!": "คัดลอกแล้ว!",
  "Image saved": "บันทึกรูปแล้ว",
  "Couldn't save the image. Try again.": "บันทึกรูปไม่สำเร็จ ลองอีกครั้ง",
  "Image saved and caption copied: paste it in your app": "บันทึกรูปและคัดลอกแคปชันแล้ว นำไปวางในแอปได้เลย",
  "Sharing didn't work. Use Save image instead.": "แชร์ไม่สำเร็จ ลองกดบันทึกรูปแทน",
  "Your browser blocked copying. Select the text and copy it manually.": "เบราว์เซอร์ไม่อนุญาตให้คัดลอก กรุณาเลือกข้อความแล้วคัดลอกเอง",
  "✏️ Edit text": "✏️ แก้ไขข้อความ",
  "Done editing": "แก้ไขเสร็จแล้ว",
  "Headline": "หัวข้อ",
  "Small text": "ข้อความรอง",
  "Button text": "ข้อความปุ่ม",
  "Sticker": "สติกเกอร์",
  "Layout": "เลย์เอาต์",
  "Quote": "คำคม",
  "Promo": "โปรโมชัน",
  "Tip": "ทิป",
  "News": "ประกาศ",
  "Colours": "สี",
  "Brand": "แบรนด์",
  "Accent": "สีเด่น",
  "Soft": "นุ่มนวล",
  "Dark": "เข้ม",
  "📷 Add your photo": "📷 เพิ่มรูปของคุณ",
  "📷 Change photo": "📷 เปลี่ยนรูป",
  "Remove photo": "ลบรูป",
  "Full photo": "รูปเต็ม",
  "Framed": "มีกรอบ",
  "Price (optional) e.g. ฿55": "ราคา (ไม่บังคับ) เช่น ฿55",
  "Your photo stays on this device. It's only used to make the image.": "รูปของคุณอยู่บนเครื่องนี้เท่านั้น ใช้แค่สร้างรูปโพสต์",
  "💾 Save changes": "💾 บันทึกการแก้ไข",
  "Saving…": "กำลังบันทึก…",
  "Changes saved": "บันทึกการแก้ไขแล้ว",
  "Photo too large or unsupported": "รูปใหญ่เกินไปหรือไม่รองรับ",

  // install
  "Add Palettai to your home screen": "เพิ่ม Palettai ไว้ที่หน้าจอโฮม",
  "Open it like an app, every morning.": "เปิดใช้เหมือนแอป ได้ทุกเช้า",
  "Install": "ติดตั้ง",
  "How?": "ทำอย่างไร?",
  "Not now": "ไว้ทีหลัง",
  "On iPhone: tap Share ⎋ then “Add to Home Screen”.": "บน iPhone: แตะปุ่มแชร์ ⎋ แล้วเลือก “เพิ่มไปยังหน้าจอโฮม”",
};

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (s: string, v?: Record<string, string | number>) => string } | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORE_KEY);
    } catch {
      /* storage blocked */
    }
    const initial: Lang = saved === "th" || saved === "en" ? saved : navigator.language?.toLowerCase().startsWith("th") ? "th" : "en";
    setLangState(initial);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORE_KEY, l);
    } catch {
      /* storage blocked */
    }
  }, []);

  const t = useCallback(
    (s: string, v?: Record<string, string | number>) => {
      let out = lang === "th" ? TH[s] ?? s : s;
      if (v) for (const [k, val] of Object.entries(v)) out = out.replaceAll(`{${k}}`, String(val));
      return out;
    },
    [lang],
  );

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useT() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useT must be used inside <LangProvider>");
  return ctx;
}
