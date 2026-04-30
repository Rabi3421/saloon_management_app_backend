import connectDB from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Staff from '@/models/Staff';
import { notifyUsers, notifySalonOwners } from './notificationService';

let started = false;

export async function startBookingScheduler() {
  if (started) return;
  started = true;

  await connectDB();

  // Run every 60 seconds
  setInterval(async () => {
    try {
      const now = new Date();

      // Auto-approve pending bookings past approvalDeadline
      const toAutoApprove = await Booking.find({
        status: 'pending',
        approvalDeadline: { $lte: now },
      });

      for (const booking of toAutoApprove) {
        booking.status = 'confirmed';
        booking.approvedAt = booking.approvedAt || new Date();
        booking.autoApproved = true;
        await booking.save();

        const bookingId = String(booking._id);

        // notify customer
        const customerId = booking.customerId ? String(booking.customerId) : null;
        if (customerId) {
          await notifyUsers({
            userIds: [customerId],
            salonId: String(booking.salonId),
            type: 'booking',
            title: 'Booking auto-approved',
            body: 'Your booking was auto-approved by the salon.',
            meta: { bookingId, targetScreen: 'Booking', status: 'confirmed' },
          });
        }

        // notify salon owners
        await notifySalonOwners({
          salonId: String(booking.salonId),
          type: 'booking',
          title: 'Booking auto-approved',
          body: 'A booking was auto-approved.',
          meta: { bookingId, targetScreen: 'OwnerBookings', status: 'confirmed' },
        });

        // notify staff if linked
        if (booking.staffId) {
          const staffRecord = await Staff.findById(booking.staffId);
          if (staffRecord?.userId) {
            await notifyUsers({
              userIds: [String(staffRecord.userId)],
              salonId: String(booking.salonId),
              type: 'booking',
              title: 'Booking assigned',
              body: 'A booking was auto-approved and assigned to you.',
              meta: { bookingId, targetScreen: 'StaffBookings', status: 'confirmed' },
            });
          }
        }
      }

      // Scheduled-time reminders: notify once when scheduledAt <= now and not yet reminderSent
      const scheduled = await Booking.find({
        status: { $in: ['confirmed'] },
        scheduledAt: { $lte: now },
        reminderSent: { $ne: true },
      });

      for (const booking of scheduled) {
        booking.reminderSent = true;
        await booking.save();

        const bookingId = String(booking._id);

        // notify staff
        if (booking.staffId) {
          const staffRecord = await Staff.findById(booking.staffId);
          if (staffRecord?.userId) {
            await notifyUsers({
              userIds: [String(staffRecord.userId)],
              salonId: String(booking.salonId),
              type: 'booking',
              title: 'Booking starting now',
              body: 'A booking scheduled for now needs your attention.',
              meta: { bookingId, targetScreen: 'StaffBookings', status: booking.status },
            });
          }
        }

        // notify salon owners
        await notifySalonOwners({
          salonId: String(booking.salonId),
          type: 'booking',
          title: 'Booking starting now',
          body: 'A booking scheduled for now is due.',
          meta: { bookingId, targetScreen: 'OwnerBookings', status: booking.status },
        });
      }
    } catch (err) {
      // Do not crash scheduler on errors
      // eslint-disable-next-line no-console
      console.error('bookingScheduler error', err);
    }
  }, 60 * 1000);
}

export default startBookingScheduler;
