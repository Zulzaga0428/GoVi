import "server-only";
import { cookies } from "next/headers";
import { accessCode } from "./store";

/**
 * Нэвтрэлт нь энгийн: байгууллагын нэг код.
 *
 * Хуучин хувилбарт код нь localStorage-д хадгалагдаж, хүсэлт бүрд толгойгоор
 * явдаг байсан. Одоо httpOnly cookie-д хадгална — JavaScript уншиж чадахгүй
 * тул илүү аюулгүй.
 *
 * ACCESS_CODE тохируулаагүй бол хуудас нээлттэй.
 */
export const COOKIE_NAME = "govi_auth";
export const SEEN_COOKIE = "govi_seen";

export function isGated(): boolean {
  return accessCode().length > 0;
}

export function isAuthed(): boolean {
  const code = accessCode();
  if (!code) return true;
  return cookies().get(COOKIE_NAME)?.value === code;
}

/** Landing-ыг өмнө нь үзсэн, ажлын самбар руу шууд орох хүн үү. */
export function hasSeenLanding(): boolean {
  return cookies().get(SEEN_COOKIE)?.value === "1";
}
