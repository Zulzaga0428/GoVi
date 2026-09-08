"use client";

import { useState } from "react";

/** Байгууллагын нэг код. Амжилттай бол httpOnly cookie тавигдана. */
export function AccessGate() {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      setMsg("Кодоо оруулна уу.");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() })
      });
      if (res.ok) {
        window.location.reload();
        return;
      }
      setMsg(res.status === 401 ? "Код буруу байна." : "Сервертэй холбогдож чадсангүй.");
    } catch {
      setMsg("Сервертэй холбогдож чадсангүй.");
    }
    setBusy(false);
  }

  return (
    <div className="scrim" style={{ alignItems: "center" }}>
      <form className="sheet narrow" onSubmit={submit}>
        <div className="sheet-head">
          <div>
            <h2>Нэвтрэх код</h2>
            <p>Энэ хуудас хаалттай. Байгууллагаас өгсөн кодоо оруулна уу.</p>
          </div>
        </div>
        <div className="sheet-body">
          <div className="f">
            <label htmlFor="ac">Код</label>
            <input
              id="ac"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <span className="hint">Кодыг энэ төхөөрөмжид цээжилнэ.</span>
          </div>
        </div>
        <div className="sheet-foot">
          <span className="form-msg">{msg}</span>
          <button className="primary" type="submit" disabled={busy}>
            {busy ? "Шалгаж байна…" : "Нэвтрэх"}
          </button>
        </div>
      </form>
    </div>
  );
}
