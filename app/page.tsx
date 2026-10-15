"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session as AuthSession } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type Student = { id: string; name: string };
type TopicRow = { id: string; topic: string; mastery: number };
type SessionRow = {
  id: string;
  session_date: string;
  notes: string | null;
  session_topics: TopicRow[];
};
type NewTopic = { topic: string; mastery: number };

const box: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 8,
  padding: 16,
  marginBottom: 16,
};
const input: React.CSSProperties = {
  padding: 8,
  border: "1px solid #bbb",
  borderRadius: 6,
  marginRight: 8,
  color: "#111",
  background: "#fff",
};
const button: React.CSSProperties = {
  padding: "8px 14px",
  border: "none",
  borderRadius: 6,
  background: "#111",
  color: "#fff",
  cursor: "pointer",
  marginRight: 8,
};

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
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: 24,
        minHeight: "100vh",
        background: "#fff",
        color: "#111",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ marginBottom: 4 }}>Tutor Tracker</h1>
      <p style={{ color: "#666", marginTop: 0 }}>
        Log sessions and track what each student has mastered.
      </p>
      {loading ? <p>Loading...</p> : auth ? <Tracker /> : <Login />}
    </main>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMsg(error.message);
  }

  async function signUp() {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) setMsg(error.message);
    else if (!data.session) setMsg("Check your email to confirm, then sign in.");
  }

  return (
    <div style={box}>
      <h2 style={{ marginTop: 0 }}>Tutor login</h2>
      <input
        style={input}
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        style={input}
        type="password"
        placeholder="Password (6+ characters)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <div style={{ marginTop: 12 }}>
        <button style={button} onClick={signIn}>Sign in</button>
        <button style={{ ...button, background: "#555" }} onClick={signUp}>
          Create account
        </button>
      </div>
      {msg && <p style={{ color: "crimson" }}>{msg}</p>}
    </div>
  );
}

function Tracker() {
  const [students, setStudents] = useState<Student[]>([]);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Student | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("students").select("id, name").order("name");
    setStudents((data as Student[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addStudent() {
    if (!name.trim()) return;
    await supabase.from("students").insert({ name: name.trim() });
    setName("");
    load();
  }

  return (
    <div>
      <div style={{ textAlign: "right" }}>
        <button
          style={{ ...button, background: "#999", marginRight: 0 }}
          onClick={() => supabase.auth.signOut()}
        >
          Sign out
        </button>
      </div>

      {selected ? (
        <StudentView student={selected} onBack={() => setSelected(null)} />
      ) : (
        <>
          <div style={box}>
            <h2 style={{ marginTop: 0 }}>Add a student</h2>
            <input
              style={input}
              placeholder="Student name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button style={button} onClick={addStudent}>Add</button>
          </div>

          <h2>Your students</h2>
          {students.length === 0 && <p style={{ color: "#666" }}>No students yet.</p>}
          {students.map((s) => (
            <div
              key={s.id}
              style={{ ...box, cursor: "pointer" }}
              onClick={() => setSelected(s)}
            >
              {s.name}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function StudentView({ student, onBack }: { student: Student; onBack: () => void }) {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [topics, setTopics] = useState<NewTopic[]>([]);
  const [topicName, setTopicName] = useState("");
  const [mastery, setMastery] = useState(3);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("sessions")
      .select("id, session_date, notes, session_topics(id, topic, mastery)")
      .eq("student_id", student.id)
      .order("session_date", { ascending: false });
    setSessions((data as unknown as SessionRow[]) ?? []);
  }, [student.id]);

  useEffect(() => {
    load();
  }, [load]);

  function addTopic() {
    if (!topicName.trim()) return;
    setTopics([...topics, { topic: topicName.trim(), mastery }]);
    setTopicName("");
    setMastery(3);
  }

  async function saveSession() {
    setErr("");
    const { data: s, error } = await supabase
      .from("sessions")
      .insert({ student_id: student.id, session_date: date, notes })
      .select("id")
      .single();
    if (error || !s) {
      setErr(error?.message ?? "Could not save session");
      return;
    }
    if (topics.length > 0) {
      const { error: topicError } = await supabase
        .from("session_topics")
        .insert(topics.map((t) => ({ session_id: s.id, topic: t.topic, mastery: t.mastery })));
      if (topicError) {
        setErr(topicError.message);
        return;
      }
    }
    setNotes("");
    setTopics([]);
    load();
  }

  // Average mastery per topic across all sessions, to suggest what to work on next
  const scores = new Map<string, number[]>();
  sessions.forEach((s) =>
    s.session_topics.forEach((t) => {
      scores.set(t.topic, [...(scores.get(t.topic) ?? []), t.mastery]);
    })
  );
  const weakest = Array.from(scores.entries())
    .map(([topic, v]) => ({ topic, avg: v.reduce((a, b) => a + b, 0) / v.length }))
    .sort((a, b) => a.avg - b.avg)[0];

  return (
    <div>
      <button style={{ ...button, background: "#999" }} onClick={onBack}>
        ← All students
      </button>
      <h2>{student.name}</h2>

      {weakest && (
        <div style={{ ...box, background: "#fff8e1" }}>
          <strong>Suggested focus next:</strong> {weakest.topic} (average mastery{" "}
          {weakest.avg.toFixed(1)} / 5)
        </div>
      )}

      <div style={box}>
        <h3 style={{ marginTop: 0 }}>Log a session</h3>
        <input style={input} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <div style={{ margin: "12px 0" }}>
          <input
            style={input}
            placeholder="Topic (e.g. Quadratics)"
            value={topicName}
            onChange={(e) => setTopicName(e.target.value)}
          />
          <select style={input} value={mastery} onChange={(e) => setMastery(Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>Mastery {n}</option>
            ))}
          </select>
          <button style={{ ...button, background: "#555" }} onClick={addTopic}>
            Add topic
          </button>
        </div>
        {topics.map((t, i) => (
          <div key={i} style={{ color: "#444" }}>• {t.topic}: {t.mastery}/5</div>
        ))}
        <textarea
          style={{ ...input, width: "100%", marginTop: 12, boxSizing: "border-box" }}
          rows={3}
          placeholder="Session notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button style={{ ...button, marginTop: 8 }} onClick={saveSession}>
          Save session
        </button>
        {err && <p style={{ color: "crimson" }}>{err}</p>}
      </div>

      <h3>Session history</h3>
      {sessions.length === 0 && <p style={{ color: "#666" }}>No sessions yet.</p>}
      {sessions.map((s) => (
        <div key={s.id} style={box}>
          <strong>{s.session_date}</strong>
          {s.session_topics.map((t) => (
            <div key={t.id}>• {t.topic}: {t.mastery}/5</div>
          ))}
          {s.notes && <p style={{ color: "#444", marginBottom: 0 }}>{s.notes}</p>}
        </div>
      ))}
    </div>
  );
}
