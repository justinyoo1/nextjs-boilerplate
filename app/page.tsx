"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Session as AuthSession } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { topicStats } from "./mastery";
import { findSimilarTopic } from "./similarity";
type Student = { id: string; name: string };
type TopicRow = { id: string; topic: string; mastery: number };
type SessionRow = {
  id: string;
  session_date: string;
  notes: string | null;
  session_topics: TopicRow[];
};
type NewTopic = { topic: string; mastery: number };

const MASTERY_COLORS = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"];

function masteryColor(n: number) {
  return MASTERY_COLORS[Math.min(5, Math.max(1, Math.round(n))) - 1];
}

function today() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const css = `
.app { min-height: 100vh; background: #f6f7fb; color: #0f172a; font-family: var(--font-geist-sans), system-ui, -apple-system, sans-serif; }
.app * { box-sizing: border-box; }
.topbar { background: #fff; border-bottom: 1px solid #e5e7eb; }
.topbar-inner { max-width: 760px; margin: 0 auto; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; }
.brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 18px; }
.logo { width: 32px; height: 32px; border-radius: 9px; background: #4f46e5; color: #fff; display: grid; place-items: center; font-size: 17px; }
.wrap { max-width: 760px; margin: 0 auto; padding: 24px 20px 64px; }
.card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 2px rgba(15,23,42,.04); }
.card-title { margin: 0 0 12px; font-size: 17px; font-weight: 700; }
.section-title { margin: 24px 0 12px; font-size: 15px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: .04em; }
.muted { color: #64748b; }
.input { width: 100%; padding: 11px 12px; font-size: 16px; font-family: inherit; border: 1px solid #d1d5db; border-radius: 10px; background: #fff; color: #0f172a; }
.input:focus { outline: none; border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,.15); }
.btn { min-height: 44px; padding: 0 18px; border: none; border-radius: 10px; background: #4f46e5; color: #fff; font-weight: 600; font-size: 15px; font-family: inherit; cursor: pointer; white-space: nowrap; }
.btn:hover { background: #4338ca; }
.btn:disabled { opacity: .6; cursor: not-allowed; }
.btn-ghost { background: transparent; color: #475569; border: 1px solid #d1d5db; }
.btn-ghost:hover { background: #f1f5f9; }
.btn-sm { min-height: 36px; padding: 0 12px; font-size: 14px; }
.row { display: flex; gap: 10px; }
.row > .input { flex: 1; }
.label { display: block; font-size: 13px; font-weight: 600; color: #475569; margin: 16px 0 6px; }
.error { color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; padding: 10px 12px; border-radius: 10px; margin-top: 12px; font-size: 14px; }
.empty { text-align: center; padding: 28px 16px; color: #64748b; border: 1.5px dashed #d1d5db; border-radius: 14px; background: #fff; }
.auth { max-width: 420px; margin: 32px auto 0; }
.link { background: none; border: none; color: #4f46e5; font: inherit; font-weight: 600; cursor: pointer; padding: 0; }
.student { display: flex; align-items: center; gap: 14px; width: 100%; text-align: left; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 14px 16px; margin-bottom: 10px; cursor: pointer; font: inherit; color: inherit; }
.student:hover { border-color: #c7d2fe; box-shadow: 0 2px 8px rgba(79,70,229,.08); }
.student-name { font-weight: 600; flex: 1; }
.chev { color: #94a3b8; font-size: 20px; }
.avatar { width: 40px; height: 40px; border-radius: 50%; background: #eef2ff; color: #4f46e5; display: grid; place-items: center; font-weight: 700; flex-shrink: 0; }
.avatar-lg { width: 52px; height: 52px; font-size: 20px; }
.student-head { display: flex; align-items: center; gap: 14px; margin: 18px 0; }
.student-head h2 { margin: 0; font-size: 24px; }
.callout { background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 14px; padding: 14px 16px; margin-bottom: 16px; color: #312e81; }
.seg { display: flex; gap: 6px; }
.seg button { flex: 1; min-height: 44px; border: 1px solid #d1d5db; border-radius: 10px; background: #fff; font-weight: 700; font-size: 16px; font-family: inherit; color: #334155; cursor: pointer; }
.seg button.on { color: #fff; border-color: transparent; }
.chip { display: inline-flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 999px; background: #f1f5f9; font-size: 14px; margin: 0 6px 6px 0; }
.chip button { border: none; background: none; cursor: pointer; color: #64748b; font-size: 18px; line-height: 1; padding: 0; }
.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
.bar-row { margin-bottom: 14px; }
.bar-row:last-child { margin-bottom: 0; }
.bar-label { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 6px; }
.bar { height: 8px; border-radius: 999px; background: #eef0f4; overflow: hidden; }
.bar > span { display: block; height: 100%; border-radius: 999px; }
.session-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.session-date { font-weight: 700; }
.notes { color: #475569; margin: 10px 0 0; white-space: pre-wrap; }
@media (max-width: 600px) {
  .wrap { padding: 16px 14px 48px; }
  .card { padding: 16px; }
  .row.stack { flex-direction: column; }
  .row.stack > .input { flex: none; }
}
`;

export default function Home() {
  const [auth, setAuth] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuth(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setAuth(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="app">
      <style>{css}</style>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="logo">∑</span>
            Tutor Tracker
          </div>
          {auth && (
            <button className="btn btn-ghost btn-sm" onClick={() => supabase.auth.signOut()}>
              Sign out
            </button>
          )}
        </div>
      </header>
      <main className="wrap">
        {loading ? <p className="muted">Loading…</p> : auth ? <Tracker /> : <Login />}
      </main>
    </div>
  );
}

function Login() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    setBusy(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) setMsg(error.message);
      else if (!data.session) setMsg("Check your email to confirm your account, then sign in.");
    }
    setBusy(false);
  }

  return (
    <div className="auth">
      <div className="card">
        <h2 className="card-title">{mode === "signin" ? "Welcome back" : "Create your account"}</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Track what every student has mastered, session by session.
        </p>
        <form onSubmit={submit}>
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button className="btn" type="submit" disabled={busy} style={{ width: "100%", marginTop: 20 }}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
        {msg && <div className="error">{msg}</div>}
        <p className="muted" style={{ textAlign: "center", marginBottom: 0 }}>
          {mode === "signin" ? "New here? " : "Already have an account? "}
          <button
            className="link"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setMsg("");
            }}
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}

function Tracker() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState<Student | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("students").select("id, name").order("name");
    if (error) setErr(error.message);
    setStudents((data as Student[]) ?? []);
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addStudent(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setErr("");
    const { error } = await supabase.from("students").insert({ name: name.trim() });
    if (error) {
      setErr(error.message);
      return;
    }
    setName("");
    load();
  }

  if (selected) {
    return <StudentView student={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div>
      <div className="card">
        <h2 className="card-title">Add a student</h2>
        <form className="row stack" onSubmit={addStudent}>
          <input
            className="input"
            placeholder="Student name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="btn" type="submit">
            Add student
          </button>
        </form>
        {err && <div className="error">{err}</div>}
      </div>

      <h2 className="section-title">Your students</h2>
      {!loaded ? (
        <p className="muted">Loading…</p>
      ) : students.length === 0 ? (
        <div className="empty">No students yet. Add your first student above to get started.</div>
      ) : (
        students.map((s) => (
          <button key={s.id} className="student" onClick={() => setSelected(s)}>
            <span className="avatar">{s.name.charAt(0).toUpperCase()}</span>
            <span className="student-name">{s.name}</span>
            <span className="chev">›</span>
          </button>
        ))
      )}
    </div>
  );
}

function StudentView({ student, onBack }: { student: Student; onBack: () => void }) {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [topics, setTopics] = useState<NewTopic[]>([]);
  const [topicName, setTopicName] = useState("");
  const [mastery, setMastery] = useState(3);
  const [saving, setSaving] = useState(false);

  const [err, setErr] = useState("");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const load = useCallback(async () => {
    const { data } = await supabase
      .from("sessions")
      .select("id, session_date, notes, session_topics(id, topic, mastery)")
      .eq("student_id", student.id)
      .order("session_date", { ascending: false });
    setSessions((data as unknown as SessionRow[]) ?? []);
    setLoaded(true);
  }, [student.id]);

  useEffect(() => {
    load();
  }, [load]);

   function commitTopic(name: string) {
    setTopics([...topics, { topic: name, mastery }]);
    setTopicName("");
    setMastery(3);
    setSuggestion(null);
  }

  function addTopic() {
    if (!topicName.trim()) return;
    const existing = [
      ...sessions.flatMap((s) => s.session_topics.map((t) => t.topic)),
      ...topics.map((t) => t.topic),
    ];
    const similar = findSimilarTopic(topicName, existing);
    if (similar) {
      setSuggestion(similar);
      return;
    }
    commitTopic(topicName.trim());
  }

  async function saveSession() {
    setErr("");
    if (topics.length === 0 && !notes.trim()) {
      setErr("Add at least one topic or a note before saving.");
      return;
    }
    setSaving(true);
    const { data: s, error } = await supabase
      .from("sessions")
      .insert({ student_id: student.id, session_date: date, notes })
      .select("id")
      .single();
    if (error || !s) {
      setErr(error?.message ?? "Could not save the session.");
      setSaving(false);
      return;
    }
    if (topics.length > 0) {
      const { error: topicError } = await supabase
        .from("session_topics")
        .insert(topics.map((t) => ({ session_id: s.id, topic: t.topic, mastery: t.mastery })));
      if (topicError) {
        setErr(topicError.message);
        setSaving(false);
        return;
      }
    }
    setNotes("");
    setTopics([]);
    setSaving(false);
    load();
  }

  // Average mastery per topic (case-insensitive), weakest first
  const stats = topicStats(sessions, today());  const weakest = stats[0];

  return (
    <div>
      <button className="btn btn-ghost btn-sm" onClick={onBack}>
        ← Students
      </button>

      <div className="student-head">
        <span className="avatar avatar-lg">{student.name.charAt(0).toUpperCase()}</span>
        <div>
          <h2>{student.name}</h2>
          <span className="muted">
            {sessions.length} session{sessions.length === 1 ? "" : "s"} logged
          </span>
        </div>
      </div>

      {weakest && (
        <div className="callout">
          <strong>Suggested focus next:</strong> {weakest.name} (average mastery{" "}
          {weakest.avg.toFixed(1)} out of 5)
        </div>
      )}

      {stats.length > 0 && (
        <div className="card">
          <h3 className="card-title">Mastery overview</h3>
          {stats.map((s) => (
            <div key={s.name} className="bar-row">
              <div className="bar-label">
                <span>{s.name}</span>
                <span className="muted">
                  {s.avg.toFixed(1)} / 5 · {s.count} session{s.count === 1 ? "" : "s"}
                </span>
              </div>
              <div className="bar">
                <span style={{ width: `${(s.avg / 5) * 100}%`, background: masteryColor(s.avg) }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h3 className="card-title">Log a session</h3>

        <label className="label" style={{ marginTop: 0 }}>Date</label>
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

        <label className="label">Topic covered</label>
        <div className="row stack">
          <input
            className="input"
            placeholder="e.g. Quadratics"
            value={topicName}
            onChange={(e) => setTopicName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTopic();
              }
            }}
          />
          <button className="btn btn-ghost" type="button" onClick={addTopic}>
            Add topic
          </button>
        </div>
        {suggestion && (
          <div className="callout" style={{ marginTop: 12, marginBottom: 0 }}>
            Did you mean <strong>{suggestion}</strong>?
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-sm" type="button" onClick={() => commitTopic(suggestion)}>
                Use “{suggestion}”
              </button>
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                onClick={() => commitTopic(topicName.trim())}
              >
                Keep “{topicName.trim()}”
              </button>
            </div>
          </div>
        )}
        <label className="label">Mastery (1 = just started, 5 = solid)</label>
        <div className="seg">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={mastery === n ? "on" : ""}
              style={mastery === n ? { background: masteryColor(n) } : undefined}
              onClick={() => setMastery(n)}
            >
              {n}
            </button>
          ))}
        </div>

        {topics.length > 0 && (
          <div style={{ marginTop: 16 }}>
            {topics.map((t, i) => (
              <span key={i} className="chip">
                <span className="dot" style={{ background: masteryColor(t.mastery) }} />
                {t.topic} · {t.mastery}/5
                <button
                  type="button"
                  aria-label="Remove topic"
                  onClick={() => setTopics(topics.filter((_, idx) => idx !== i))}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <label className="label">Notes</label>
        <textarea
          className="input"
          rows={3}
          placeholder="What went well? What should we revisit?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <button
          className="btn"
          style={{ width: "100%", marginTop: 16 }}
          onClick={saveSession}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save session"}
        </button>
        {err && <div className="error">{err}</div>}
      </div>

      <h2 className="section-title">Session history</h2>
      {!loaded ? (
        <p className="muted">Loading…</p>
      ) : sessions.length === 0 ? (
      <div className="empty">No sessions yet. Log your first session above to see progress here.</div>
      ) : (
        sessions.map((s) => (
          <div key={s.id} className="card">
            <div className="session-head">
              <span className="session-date">{formatDate(s.session_date)}</span>
            </div>
            {s.session_topics.map((t) => (
              <span key={t.id} className="chip">
                <span className="dot" style={{ background: masteryColor(t.mastery) }} />
                {t.topic} · {t.mastery}/5
              </span>
            ))}
            {s.notes && <p className="notes">{s.notes}</p>}
          </div>
        ))
      )}
    </div>
  );
}
