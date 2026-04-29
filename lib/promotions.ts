import { Types } from "mongoose";
import { IPromotion } from "@/models/Promotion";

type ServiceLike = {
  _id: string | Types.ObjectId;
  price?: number;
};

export function isPromotionActive(promotion: IPromotion, now = new Date()) {
  if (!promotion.isActive) return false;
  if (promotion.startsAt && promotion.startsAt > now) return false;
  if (promotion.endsAt && promotion.endsAt < now) return false;
  if (
    typeof promotion.usageLimit === "number" &&
    promotion.usageLimit > 0 &&
    promotion.usageCount >= promotion.usageLimit
  ) {
    return false;
  }
  return true;
}

export function calculatePromotionDiscount(
  promotion: IPromotion,
  services: ServiceLike[],
  subtotal: number
) {
  if (!isPromotionActive(promotion)) {
    return { discountAmount: 0, reason: "inactive" as const };
  }

  if (subtotal < (promotion.minBookingAmount || 0)) {
    return { discountAmount: 0, reason: "min-booking-not-met" as const };
  }

  const eligibleIds = new Set(
    (promotion.appliesToServiceIds || []).map((id) => String(id))
  );
  const eligibleServices =
    eligibleIds.size === 0
      ? services
      : services.filter((service) => eligibleIds.has(String(service._id)));

  if (promotion.type === "free_service") {
    const freeServiceValue = eligibleServices.reduce(
      (sum, service) => sum + Number(service.price || 0),
      0
    );
    return {
      discountAmount: Math.min(subtotal, freeServiceValue),
      reason: freeServiceValue > 0 ? null : ("not-applicable" as const),
    };
  }

  if (eligibleIds.size > 0 && eligibleServices.length === 0) {
    return { discountAmount: 0, reason: "not-applicable" as const };
  }

  if (promotion.type === "percentage") {
    const discountAmount = Math.round((subtotal * Number(promotion.value || 0)) / 100);
    return { discountAmount: Math.min(subtotal, discountAmount), reason: null };
  }

  const flatAmount = Math.max(0, Number(promotion.value || 0));
  return {
    discountAmount: Math.min(subtotal, flatAmount),
    reason: null,
  };
}
