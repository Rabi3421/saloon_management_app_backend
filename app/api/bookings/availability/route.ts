import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Booking from '@/models/Booking';
import '@/models/Salon';
import '@/models/Staff';
import { authenticate, isAuthError } from '@/middleware/auth';
import { successResponse, errorResponse } from '@/lib/apiHelpers';

export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get('staffId');
    const date = searchParams.get('date'); // expected YYYY-MM-DD

    if (!staffId) return errorResponse('staffId is required', 422);
    if (!date) return errorResponse('date is required', 422);

    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);

    const occupied = await Booking.find({
      salonId: auth.payload.salonId,
      staffId,
      bookingDate: { $gte: start, $lt: end },
      status: { $in: ['pending', 'confirmed', 'rescheduled', 'started'] },
    }).select('timeSlot -_id');

    const slots = Array.from(new Set(occupied.map(b => String(b.timeSlot))));

    return successResponse(slots, 'Occupied slots fetched');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return errorResponse(message, 500);
  }
}
