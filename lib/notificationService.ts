import Notification, { NotificationType } from "@/models/Notification";
import User from "@/models/User";
import { sendPushToTokens } from "@/lib/firebaseAdmin";

type NotificationMetaValue = string | number | boolean;

type NotifyUsersInput = {
  userIds: string[];
  salonId?: string | null;
  type: NotificationType;
  title: string;
  body: string;
  meta?: Record<string, NotificationMetaValue | undefined>;
};

function toPushData(input: {
  notificationId: string;
  type: NotificationType;
  meta?: Record<string, NotificationMetaValue | undefined>;
}) {
  const data: Record<string, string> = {
    notificationId: input.notificationId,
    type: input.type,
  };

  for (const [key, value] of Object.entries(input.meta ?? {})) {
    if (value === undefined) continue;
    data[key] = String(value);
  }

  return data;
}

export async function notifyUsers(input: NotifyUsersInput) {
  const uniqueUserIds = Array.from(new Set(input.userIds.filter(Boolean)));

  if (uniqueUserIds.length === 0) {
    return [];
  }

  const notifications = await Notification.insertMany(
    uniqueUserIds.map((userId) => ({
      userId,
      salonId: input.salonId || undefined,
      type: input.type,
      title: input.title,
      body: input.body,
      meta: input.meta,
    }))
  );

  const users = await User.find(
    { _id: { $in: uniqueUserIds }, isActive: true },
    { deviceTokens: 1 }
  );

  const notificationByUserId = new Map(
    notifications.map((notification) => [String(notification.userId), notification])
  );

  const pushTargets = users.flatMap((user) => {
    const notification = notificationByUserId.get(String(user._id));
    if (!notification) return [];

    return (user.deviceTokens ?? []).map((deviceToken) => ({
      token: deviceToken.token,
      notificationId: String(notification._id),
    }));
  });

  await sendPushToTokens({
    tokens: pushTargets.map((target) => target.token),
    title: input.title,
    body: input.body,
    data: toPushData({
      notificationId: pushTargets[0]?.notificationId ?? String(notifications[0]._id),
      type: input.type,
      meta: input.meta,
    }),
  });

  return notifications;
}

export async function notifySalonOwners(
  input: Omit<NotifyUsersInput, "userIds"> & { salonId: string }
) {
  const owners = await User.find(
    { salonId: input.salonId, role: "owner", isActive: true },
    { _id: 1 }
  );

  return notifyUsers({
    ...input,
    userIds: owners.map((owner) => String(owner._id)),
  });
}

export async function notifySalonCustomers(
  input: Omit<NotifyUsersInput, "userIds"> & { salonId: string }
) {
  const customers = await User.find(
    { salonId: input.salonId, role: "customer", isActive: true },
    { _id: 1 }
  );

  return notifyUsers({
    ...input,
    userIds: customers.map((customer) => String(customer._id)),
  });
}