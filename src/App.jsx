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

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedSlots, setSelectedSlots] = useState([]);

  const [bookingState, setBookingState] = useState({
    status: "idle",
    title: "",
    message: "",
    bookings: [],
  });

  const [showSuccess, setShowSuccess] = useState(false);
  const [lastBooking, setLastBooking] = useState(null);

  /* ================= Kurse laden ================= */

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${SCRIPT_URL}?fn=courses&_ts=${Date.now()}`);
        const data = await res.json();
        if (!data.ok) throw new Error("Kurse konnten nicht geladen werden");
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
      setSelectedSlots([]);
      setBookingState({ status: "idle", title: "", message: "", bookings: [] });

      try {
        const res = await fetch(
          `${SCRIPT_URL}?fn=slots&course=${encodeURIComponent(selectedCourse)}&_ts=${Date.now()}`
        );
        const data = await res.json();
        if (!data.ok) throw new Error("Termine konnten nicht geladen werden");
        setSlots(data.slots || []);
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

      if (!data.ok) {
        if (data.error === "MAX_BOOKINGS_REACHED") {
          setBookingState({
            status: "error",
            title: "Maximal 2 Termine möglich",
            message: data.message,
            bookings: data.bookings || [],
          });
          return;
        }

        setBookingState({
          status: "error",
          title: "Buchung fehlgeschlagen",
          message: data.message || "Unbekannter Fehler",
          bookings: [],
        });
        return;
      }

      setLastBooking({
        course: selectedCourse,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        slots: data.results.map((r) => r.slot),
      });

      setShowSuccess(true);
      setBookingState({ status: "idle", title: "", message: "", bookings: [] });
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
    <div className="min-h-screen">
      <header className="mx-auto max-w-5xl px-4 py-8 text-center">
        <img
          src="/logo.png"
          alt="Stressfrei Lernen"
          className="mx-auto mb-4 h-16 w-auto"
        />
        <h1 className="text-4xl font-extrabold">
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
          {slotsLoading ? (
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input
              className="rounded-xl border px-3 py-2"
              placeholder="Vorname"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <input
              className="rounded-xl border px-3 py-2"
              placeholder="Nachname"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          <button
            onClick={book}
            disabled={!canSubmit}
            className="btn btn-primary mt-6"
          >
            Buchen
          </button>

          {bookingState.status === "error" && (
            <div className="mt-4 bg-red-50 border p-4 rounded">
              <b>{bookingState.title}</b>
              <div>{bookingState.message}</div>
              {bookingState.bookings.length > 0 && (
                <ul className="mt-2 list-disc pl-5">
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
    slots.forEach((s) => {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    });
    return map;
  }, [slots]);

  function toggle(s) {
    const exists = selected.some(
      (x) => x.date === s.date && x.time === s.time
    );
    if (exists) {
      onChange(selected.filter((x) => !(x.date === s.date && x.time === s.time)));
    } else if (selected.length < MAX_SELECTABLE_SLOTS) {
      onChange([...selected, { date: s.date, time: s.time }]);
    }
  }

  return (
    <>
      <div className="text-sm mb-2">
        Ausgewählt: {selected.length} / {MAX_SELECTABLE_SLOTS}
      </div>

      {Object.keys(grouped).map((date) => (
        <div key={date} className="mb-4">
          <div className="font-bold mb-2">{date}</div>
          <div className="grid grid-cols-2 gap-3">
            {grouped[date].map((s) => (
              <button
                key={`${s.date}-${s.time}`}
                onClick={() => toggle(s)}
                className="card p-3 text-left"
              >
                {s.time} – frei: {s.remaining}
              </button>
            ))}
          </div>
        </div>
      ))}
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
          className={`card p-4 ${selected === c ? "bg-blue-50" : ""}`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

function Skeleton({ text }) {
  return <div className="p-4 bg-slate-100 rounded">{text}</div>;
}

function ErrorBox({ msg }) {
  return <div className="p-4 bg-red-50 rounded">{msg}</div>;
}

function SuccessModal({ open, details, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl">
        <h3 className="font-bold mb-2">Buchung bestätigt</h3>
        <ul>
          {(details?.slots || []).map((s, i) => (
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
