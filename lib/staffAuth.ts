import Staff from "@/models/Staff";

export async function getStaffMemberForUser(input: {
  salonId: string | null;
  userId: string;
}) {
  if (!input.salonId) {
    return null;
  }

  return Staff.findOne({
    salonId: input.salonId,
    userId: input.userId,
    isActive: true,
  });
}