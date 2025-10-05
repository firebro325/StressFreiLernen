import React, { useEffect, useMemo, useState } from "react";

const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzkNocTapN9nrCqhUgTx8rAMufYTf5bUUMf-DUEs7GHzoakMzEBBEE0eHUctFI26HCV/exec";

export default function App() {
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [courseError, setCourseError] = useState("");

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null); // {date, time}

  const [bookingState, setBookingState] = useState({
    status: "idle",
    message: "",
  });

  // Popup nach Erfolg
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastBooking, setLastBooking] = useState(null); // { course, date, time, firstName, lastName }

  // Kurse laden
  useEffect(() => {
    (async () => {
      setCoursesLoading(true);
      setCourseError("");
      try {
        const res = await fetch(`${SCRIPT_URL}?fn=courses&_ts=${Date.now()}`, {
          cache: "no-store",
        });
        const txt = await res.text();
        let data;
        try {
          data = JSON.parse(txt);
        } catch {
          throw new Error(`Ungültige Antwort vom Server: ${txt.slice(0, 200)}`);
        }
        if (!res.ok || !data.ok)
          throw new Error(
            data?.error || data?.message || "Kurse konnten nicht geladen werden"
          );
        setCourses(data.courses || []);
      } catch (e) {
        setCourseError(String(e.message || e));
      } finally {
        setCoursesLoading(false);
      }
    })();
  }, []);

  // Slots laden, wenn Kurs gewählt
  useEffect(() => {
    if (!selectedCourse) return;
    (async () => {
      setSlotsLoading(true);
      setSlotsError("");
      setSlots([]);
      setSelectedSlot(null);
      try {
        const res = await fetch(
          `${SCRIPT_URL}?fn=slots&course=${encodeURIComponent(
            selectedCourse
          )}&_ts=${Date.now()}`,
          { cache: "no-store" }
        );
        const txt = await res.text();
        let data;
        try {
          data = JSON.parse(txt);
        } catch {
          throw new Error(`Ungültige Antwort: ${txt.slice(0, 200)}`);
        }
        if (!res.ok || !data.ok)
          throw new Error(
            data?.error ||
              data?.message ||
              "Termine konnten nicht geladen werden"
          );
        setSlots(data.slots || []);
      } catch (e) {
        setSlotsError(String(e.message || e));
      } finally {
        setSlotsLoading(false);
      }
    })();
  }, [selectedCourse]);

  const canSubmit = useMemo(
    () => selectedCourse && selectedSlot && firstName.trim() && lastName.trim(),
    [selectedCourse, selectedSlot, firstName, lastName]
  );

  async function book() {
    if (!canSubmit) return;
    setBookingState({ status: "loading", message: "Buchen…" });
    try {
      const body = JSON.stringify({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        course: selectedCourse,
        date: selectedSlot.date, // TT.MM.JJJJ
        time: selectedSlot.time, // HH:MM
      });
      const res = await fetch(SCRIPT_URL, { method: "POST", body });
      const txt = await res.text();
      let data;
      try {
        data = JSON.parse(txt);
      } catch {
        throw new Error(`Ungültige Antwort: ${txt.slice(0, 200)}`);
      }
      if (!res.ok || !data.ok) {
        const map = {
          ALREADY_BOOKED:
            "Diese Person ist für diesen Termin bereits eingetragen.",
          SLOT_FULL: "Termin ist leider voll.",
          UNKNOWN_SLOT: "Unbekannter Termin.",
          FIELDS_MISSING: "Bitte alle Felder ausfüllen.",
        };
        throw new Error(
          map[data?.error] ||
            data?.error ||
            data?.message ||
            "Buchung fehlgeschlagen"
        );
      }
      setBookingState({
        status: "success",
        message: "Erfolgreich eingetragen!",
      });

      // Infos für das Popup merken
      setLastBooking({
        course: selectedCourse,
        date: selectedSlot.date,
        time: selectedSlot.time,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      setShowSuccess(true);

      // Slots aktualisieren (Restplätze)
      const res2 = await fetch(
        `${SCRIPT_URL}?fn=slots&course=${encodeURIComponent(
          selectedCourse
        )}&_ts=${Date.now()}`,
        { cache: "no-store" }
      );
      const data2 = await res2.json();
      if (data2?.ok) setSlots(data2.slots || []);
    } catch (e) {
      setBookingState({ status: "error", message: String(e.message || e) });
    }
  }

  return (
    <div className="min-h-screen">
      <header className="mx-auto max-w-5xl px-4 py-8 sm:py-10 text-center">
        <img
          src="/logo.png"
          alt="Stressfrei Lernen"
          className="mx-auto mb-4 h-16 w-auto"
          decoding="async"
          loading="eager"
        />

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
          Schwimmkurs Ersatztermine
        </h1>

        <p className="mt-2 text-sm sm:text-base text-slate-600">
          Bitte folge den Schritten: <b>1) Kurs wählen</b> →{" "}
          <b>2) Termin wählen</b> → <b>3) Vor- & Nachname eintragen</b> →{" "}
          <b>4) Buchen</b>
        </p>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16">
        {/* Schritt 1 */}
        <section>
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow">
              1
            </div>
            <h2 className="step-title">Kurs wählen</h2>
          </div>

          {coursesLoading ? (
            <Skeleton text="Kurse werden geladen…" />
          ) : courseError ? (
            <ErrorBox msg={courseError} />
          ) : (
            <CourseGrid
              courses={courses}
              selected={selectedCourse}
              onSelect={setSelectedCourse}
            />
          )}
        </section>

        {/* Schritt 2 */}
        <section className="mt-10">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow">
              2
            </div>
            <h2 className="step-title">Termin wählen</h2>
          </div>

          {!selectedCourse ? (
            <InfoBox msg="Bitte erst einen Kurs wählen." />
          ) : slotsLoading ? (
            <Skeleton text="Termine werden geladen…" />
          ) : slotsError ? (
            <ErrorBox msg={slotsError} />
          ) : slots.length === 0 ? (
            <InfoBox msg="Für diesen Kurs sind momentan keine Termine verfügbar." />
          ) : (
            <SlotList
              slots={slots}
              selected={selectedSlot}
              onSelect={setSelectedSlot}
            />
          )}
        </section>

        {/* Schritt 3 */}
        <section className="mt-10">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow">
              3
            </div>
            <h2 className="step-title">Vor- & Nachname eintragen</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Vorname
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Max"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Nachname
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Mustermann"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={book}
              disabled={!canSubmit || bookingState.status === "loading"}
              className={`btn ${
                canSubmit && bookingState.status !== "loading"
                  ? "btn-primary"
                  : "btn-disabled"
              }`}
            >
              {bookingState.status === "loading" ? "Buchen…" : "Buchen"}
            </button>
            {bookingState.status === "success" && (
              <span className="text-sm font-medium text-green-700">
                {bookingState.message}
              </span>
            )}
            {bookingState.status === "error" && (
              <span className="text-sm font-medium text-red-700">
                {bookingState.message}
              </span>
            )}
          </div>
        </section>
      </main>
      <SuccessModal
        open={showSuccess}
        details={lastBooking}
        onClose={() => setShowSuccess(false)}
      />
    </div>
  );
}

/* ===== UI-Komponenten (helle Karten) ===== */

function Skeleton({ text }) {
  return (
    <div className="card card-pad">
      <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
      <p className="mt-2 text-sm text-slate-600">{text}</p>
    </div>
  );
}

function InfoBox({ msg }) {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-800">
      {msg}
    </div>
  );
}

function ErrorBox({ msg }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
      {msg}
    </div>
  );
}

function CourseGrid({ courses, selected, onSelect }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((c) => (
        <button
          key={c}
          onClick={() => onSelect(c)}
          className={`group card card-pad text-left transition
            ${
              selected === c
                ? "border-blue-600 bg-blue-50"
                : "hover:border-blue-300"
            }
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <div className="text-base font-semibold ellipsis">{c}</div>
              <div className="mt-1 text-xs text-slate-600">
                Klicken, um Termine zu sehen
              </div>
            </div>
            <div className={`dot ${selected === c ? "dot-blue" : ""}`} />
          </div>
        </button>
      ))}
    </div>
  );
}

function SlotList({ slots, selected, onSelect }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {slots.map((s) => {
        const key = `${s.date}_${s.time}`;
        const full = s.remaining <= 0;
        const isSel =
          selected && selected.date === s.date && selected.time === s.time;

        return (
          <button
            key={key}
            disabled={full}
            onClick={() => onSelect({ date: s.date, time: s.time })}
            className={`text-left transition card card-pad
              ${full ? "card-muted" : "hover:border-emerald-300"}
              ${isSel ? "border-emerald-600 bg-emerald-50" : ""}
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500`}
          >
            <div className="flex items-center justify-between gap-3">
              {/* links: Datum + Zeit */}
              <div className="min-w-0">
                <div className="text-base font-semibold wrap">
                  {s.date} {s.time}
                </div>
              </div>

              {/* rechts: große Kapazität + Status-Punkt */}
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-base font-semibold text-slate-900">
                  frei: {s.remaining}/{s.capacity}
                </span>
                <div className={`dot ${full ? "" : "dot-emerald"}`} />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function SuccessModal({ open, details, onClose }) {
  if (!open) return null;

  const d = details || {};
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative z-[101] w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          {/* simpler Haken */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            className="text-emerald-600"
          >
            <path
              fill="currentColor"
              d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
            />
          </svg>
        </div>

        <h3 className="text-center text-xl font-semibold">Buchung bestätigt</h3>
        <p className="mt-2 text-center text-slate-600">
          {d.firstName} {d.lastName} wurde erfolgreich eingetragen.
        </p>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm text-slate-500">Kurs</div>
          <div className="text-base font-semibold">{d.course || "—"}</div>

          <div className="mt-2 text-sm text-slate-500">Termin</div>
          <div className="text-base font-semibold">
            {d.date || "—"} {d.time || ""}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button className="btn btn-primary" onClick={onClose} autoFocus>
            Alles klar
          </button>
        </div>
      </div>
    </div>
  );
}
