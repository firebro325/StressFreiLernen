import React, { useEffect, useMemo, useState } from "react";

const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzkNocTapN9nrCqhUgTx8rAMufYTf5bUUMf-DUEs7GHzoakMzEBBEE0eHUctFI26HCV/exec";

// 🔒 Frontend-Limit
const MAX_SELECTABLE_SLOTS = 2;

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
  const [selectedSlots, setSelectedSlots] = useState([]);

  const [bookingState, setBookingState] = useState({
    status: "idle", // idle | loading | success | error
    title: "",
    message: "",
    bookings: [],
  });

  const [showSuccess, setShowSuccess] = useState(false);
  const [lastBooking, setLastBooking] = useState(null);

  /* ================= Kurse laden ================= */

  useEffect(() => {
    (async () => {
      setCoursesLoading(true);
      try {
        const res = await fetch(`${SCRIPT_URL}?fn=courses&_ts=${Date.now()}`);
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error("Kurse konnten nicht geladen werden");
        setCourses(data.courses || []);
      } catch (e) {
        setCourseError(String(e.message || e));
      } finally {
        setCoursesLoading(false);
      }
    })();
  }, []);

  /* ================= Slots laden ================= */

  useEffect(() => {
    if (!selectedCourse) return;
    (async () => {
      setSlotsLoading(true);
      setSlots([]);
      setSelectedSlots([]);
      setBookingState({ status: "idle", title: "", message: "", bookings: [] });

      try {
        const res = await fetch(
          `${SCRIPT_URL}?fn=slots&course=${encodeURIComponent(selectedCourse)}&_ts=${Date.now()}`
        );
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error("Termine konnten nicht geladen werden");
        setSlots(data.slots || []);
      } catch (e) {
        setSlotsError(String(e.message || e));
      } finally {
        setSlotsLoading(false);
      }
    })();
  }, [selectedCourse]);

  /* ================= Validation ================= */

  const canSubmit = useMemo(() => {
    return (
      selectedCourse &&
      selectedSlots.length > 0 &&
      selectedSlots.length <= MAX_SELECTABLE_SLOTS &&
      firstName.trim() &&
      lastName.trim()
    );
  }, [selectedCourse, selectedSlots, firstName, lastName]);

  async function refreshSlots() {
    if (!selectedCourse) return;
    const res = await fetch(
      `${SCRIPT_URL}?fn=slots&course=${encodeURIComponent(selectedCourse)}&_ts=${Date.now()}`
    );
    const data = await res.json();
    if (data?.ok) setSlots(data.slots || []);
  }

  /* ================= Buchung ================= */

  async function book() {
    if (!canSubmit) return;

    setBookingState({ status: "loading", title: "", message: "Buchen…", bookings: [] });

    try {
      const res = await fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          course: selectedCourse,
          slots: selectedSlots,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        if (data?.error === "MAX_BOOKINGS_REACHED") {
          setBookingState({
            status: "error",
            title: "Maximal 2 Termine möglich",
            message: data.message,
            bookings: data.bookings || [],
          });
          await refreshSlots();
          return;
        }

        setBookingState({
          status: "error",
          title: "Buchung fehlgeschlagen",
          message: data?.message || "Unbekannter Fehler",
          bookings: [],
        });
        await refreshSlots();
        return;
      }

      setBookingState({
        status: "success",
        title: "Buchung erfolgreich",
        message: `Gebucht: ${data.summary.ok}`,
        bookings: [],
      });

      setLastBooking({
        course: selectedCourse,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        slots: data.results.map((r) => ({
          ...r.slot,
          ok: r.ok,
          error: r.error,
        })),
      });

      setShowSuccess(true);
      await refreshSlots();
    } catch (e) {
      setBookingState({
        status: "error",
        title: "Fehler",
        message: String(e.message || e),
        bookings: [],
      });
    }
  }

  /* ================= Render ================= */

  return (
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
      </header>
    
      <main className="mx-auto max-w-5xl px-4 pb-16">
        {/* Schritt 1 */}
        <section>
          <h2 className="font-bold mb-3">1) Kurs wählen</h2>
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
          <h2 className="font-bold mb-3">2) Termin wählen</h2>
          {!selectedCourse ? (
            <InfoBox msg="Bitte zuerst einen Kurs wählen." />
          ) : slotsLoading ? (
            <Skeleton text="Termine werden geladen…" />
          ) : (
            <SlotList
              slots={slots}
              selected={selectedSlots}
              onChange={setSelectedSlots}
            />
          )}
        </section>

        {/* Schritt 3 */}
        <section className="mt-10">
          <h2 className="font-bold mb-3">3) Name eingeben</h2>

          <div className="grid grid-cols-2 gap-4">
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 shadow-sm
                         focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Vorname"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 shadow-sm
                         focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Nachname"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          <div className="mt-6">
            <button
              onClick={book}
              disabled={!canSubmit || bookingState.status === "loading"}
              className="btn btn-primary"
            >
              {bookingState.status === "loading" ? "Buchen…" : "Buchen"}
            </button>
          </div>

          {bookingState.status !== "idle" && bookingState.status !== "loading" && (
            <div
              className={`mt-4 rounded-xl border p-4 ${
                bookingState.status === "success"
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <div className="font-bold">{bookingState.title}</div>
              <div className="text-sm mt-1">{bookingState.message}</div>

              {bookingState.bookings.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-sm">
                  {bookingState.bookings.map((b, i) => (
                    <li key={i}>
                      {b.date} {b.time}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
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

/* ================= Komponenten ================= */

function SlotList({ slots, selected, onChange }) {
  const grouped = useMemo(() => {
    const map = {};
    for (const s of slots) {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    }
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => a.time.localeCompare(b.time))
    );
    return map;
  }, [slots]);

  const dates = Object.keys(grouped);

  function isSelected(s) {
    return selected.some((x) => x.date === s.date && x.time === s.time);
  }

  function toggle(s) {
    if (isSelected(s)) {
      onChange(selected.filter((x) => !(x.date === s.date && x.time === s.time)));
    } else {
      if (selected.length >= MAX_SELECTABLE_SLOTS) return;
      onChange([...selected, { date: s.date, time: s.time }]);
    }
  }

  return (
    <>
      <div className="mb-2 text-sm">
        Ausgewählt: <b>{selected.length}</b> / {MAX_SELECTABLE_SLOTS}
      </div>

      <div className="space-y-6">
        {dates.map((date) => (
          <div key={date}>
            <div className="font-bold mb-2">{date}</div>
            <div className="grid grid-cols-2 gap-3">
              {grouped[date].map((s) => {
                const full = s.remaining <= 0;
                const sel = isSelected(s);
                return (
                  <button
                    key={`${s.date}_${s.time}`}
                    disabled={full}
                    onClick={() => toggle(s)}
                    className={`card p-3 text-left ${
                      sel ? "border-emerald-600 bg-emerald-50" : ""
                    }`}
                  >
                    <div className="flex justify-between">
                      <span>
                        {s.date} {s.time}
                      </span>
                      <span>
                        frei: {s.remaining}/{s.capacity}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function CourseGrid({ courses, selected, onSelect }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {courses.map((c) => (
        <button
          key={c}
          onClick={() => onSelect(c)}
          className={`card p-4 ${selected === c ? "border-blue-600 bg-blue-50" : ""}`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

function Skeleton({ text }) {
  return <div className="card p-4 text-slate-500">{text}</div>;
}

function InfoBox({ msg }) {
  return <div className="card p-4 bg-blue-50">{msg}</div>;
}

function ErrorBox({ msg }) {
  return <div className="card p-4 bg-red-50">{msg}</div>;
}

function SuccessModal({ open, details, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <div className="bg-white p-6 rounded-xl max-w-md w-full">
        <h3 className="font-bold text-lg mb-2">Buchung bestätigt</h3>
        <ul className="text-sm">
          {details.slots.map((s, i) => (
            <li key={i}>
              {s.date} {s.time}
            </li>
          ))}
        </ul>
        <button onClick={onClose} className="btn btn-primary mt-4">
          OK
        </button>
      </div>
    </div>
  );
}
