import { NextResponse } from "next/server";
import { isAdmin } from "@/app/lib/auth";
import { getAvailability, getBookedSlots, setAvailability } from "@/app/lib/db";

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || currentMonth();

  try {
    const [availability, bookedSlots] = await Promise.all([
      getAvailability(month),
      getBookedSlots(month),
    ]);

    const bookedByDate = bookedSlots.reduce((acc, slot) => {
      acc[slot.date] ||= new Set();
      acc[slot.date].add(slot.time);
      return acc;
    }, {});

    const days = availability.map((day) => ({
      date: day.date,
      slots: day.slots.map((time) => ({
        time,
        booked: bookedByDate[day.date]?.has(time) || false,
      })),
    }));

    return NextResponse.json({ days });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const availability = await setAvailability(body.date, body.slots || []);
    return NextResponse.json({ availability });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
