export interface AppContentLink {
  label: string;
  url: string;
}

export interface AppContentContact {
  label: string;
  value: string;
  kind: "email" | "phone" | "website" | "chat";
  target?: string;
}

export interface AppContentResponse {
  appName: string;
  brandTagline: string;
  supportEmail: string;
  supportPhone?: string;
  privacyPolicy: {
    title: string;
    lastUpdated: string;
    intro: string;
    sections: Array<{ title: string; body: string }>;
  };
  helpSupport: {
    title: string;
    intro: string;
    faqs: Array<{ question: string; answer: string }>;
    contacts: AppContentContact[];
  };
  rateApp: {
    title: string;
    subtitle: string;
    description: string;
    highlights: string[];
    primaryLabel: string;
    secondaryLabel: string;
    androidUrl: string;
    androidWebUrl: string;
    iosUrl?: string;
    webFallbackUrl?: string;
    feedbackEmail: string;
  };
  aboutUs: {
    title: string;
    headline: string;
    summary: string;
    mission: string;
    values: Array<{ title: string; description: string }>;
    quickFacts: Array<{ label: string; value: string }>;
    links: AppContentLink[];
    footer: string;
  };
  salon: {
    _id: string;
    name: string;
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
    about?: string;
    tagline?: string;
    logo?: string;
  };
}

interface BuildAppContentInput {
  salon: AppContentResponse["salon"];
  reviewCount: number;
  serviceCount: number;
  staffCount: number;
}

export function buildPublicAppContent({
  salon,
  reviewCount,
  serviceCount,
  staffCount,
}: BuildAppContentInput): AppContentResponse {
  const appName = salon.name || "Salon";
  const supportEmail = salon.email || "support@example.com";
  const supportPhone = salon.phone || "";
  const website = salon.website || "";
  const iosUrl = process.env.IOS_APP_REVIEW_URL || undefined;
  const androidPackageId = "com.saloon";
  const androidUrl = `market://details?id=${androidPackageId}`;
  const androidWebUrl = `https://play.google.com/store/apps/details?id=${androidPackageId}`;
  const webFallbackUrl = website || androidWebUrl;
  const lastUpdated = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return {
    appName,
    brandTagline:
      salon.tagline ||
      "Book trusted salon services, stay informed, and reach your salon team from one place.",
    supportEmail,
    supportPhone,
    privacyPolicy: {
      title: "Privacy Policy",
      lastUpdated,
      intro: `${appName} uses your information only to run bookings, support communication, payments, and service updates inside this salon experience. This policy explains what we collect, why we collect it, and how you can control it.`,
      sections: [
        {
          title: "What we collect",
          body: "We collect the details you actively provide when you sign up, book, pay, review, or message the salon. This can include your name, email address, phone number, booking selections, payment method references, and support requests.",
        },
        {
          title: "Why we use it",
          body: "We use this information to confirm appointments, coordinate with staff, send service updates, keep your account secure, and improve the booking experience for this salon's customers.",
        },
        {
          title: "How salon data stays scoped",
          body: "Your customer account is linked to the current salon context. Owners and staff can only access customer records that belong to their own salon, and not to any other business using the platform.",
        },
        {
          title: "Payments and notifications",
          body: "Payment status, saved methods, and notification preferences are used only to complete transactions and keep you updated about bookings, chats, and offers you choose to receive.",
        },
        {
          title: "Your choices",
          body: "You can update your profile information, manage saved payment methods, and contact the salon for account help at any time. If you want account data removed or corrected, use the support contacts below.",
        },
        {
          title: "Contact for privacy requests",
          body: `For privacy questions or data requests, contact ${supportEmail}${supportPhone ? ` or call ${supportPhone}` : ""}.`,
        },
      ],
    },
    helpSupport: {
      title: "Help & Support",
      intro: `Need help with a booking, payment, or salon message? ${appName} support is built to help customers solve common issues quickly and reach the salon team when needed.`,
      faqs: [
        {
          question: "How do I book a service?",
          answer: "Open a service, choose your preferred date, time slot, and staff member, then confirm the booking summary. The salon will receive your request immediately.",
        },
        {
          question: "How do I track booking updates?",
          answer: "Booking status changes appear in the Bookings tab and can also trigger notifications when the salon confirms, completes, or cancels your appointment.",
        },
        {
          question: "Can I contact the salon directly?",
          answer: "Yes. You can message the salon from the app, use the call button where available, or reach out through the dynamic support details shown below.",
        },
        {
          question: "What if my payment or offer looks wrong?",
          answer: "Open the related booking, verify the selected services and promotion, then contact support if the total still looks incorrect. The salon team can review the order details for you.",
        },
        {
          question: "How do I update my account information?",
          answer: "Go to Edit Profile to update your personal details. If you cannot access your account, use the email or phone support contact below for assistance.",
        },
      ],
      contacts: [
        { label: "Email support", value: supportEmail, kind: "email", target: supportEmail },
        ...(supportPhone
          ? [{ label: "Call support", value: supportPhone, kind: "phone" as const, target: supportPhone }]
          : []),
        ...(website
          ? [{ label: "Website", value: website, kind: "website" as const, target: website }]
          : []),
        { label: "Live chat", value: `Chat directly with ${appName}`, kind: "chat", target: salon._id },
      ],
    },
    rateApp: {
      title: "Rate the App",
      subtitle: `Help improve ${appName}`,
      description: `Your rating helps us improve bookings, communication, and reliability for customers using ${appName}.`,
      highlights: [
        "Share what felt smooth in the booking journey.",
        "Point out bugs or friction in messaging, payments, or updates.",
        "Tell us what would make future appointments easier to manage.",
      ],
      primaryLabel: "Open rating page",
      secondaryLabel: "Send feedback by email",
      androidUrl,
      androidWebUrl,
      iosUrl,
      webFallbackUrl,
      feedbackEmail: supportEmail,
    },
    aboutUs: {
      title: "About Us",
      headline: `${appName} is built to make salon visits easier to discover, book, and manage.`,
      summary:
        salon.about ||
        `${appName} brings together appointments, customer updates, promotions, and support so clients and salon teams stay connected before and after every visit.`,
      mission:
        "Our mission is to reduce booking friction, strengthen customer communication, and give salons a simple digital space that still feels personal.",
      values: [
        {
          title: "Clarity first",
          description: "Every booking, update, and support touchpoint should feel simple enough to understand at a glance.",
        },
        {
          title: "Salon-scoped trust",
          description: "Customers and owners should only see the information that belongs to their own salon relationship.",
        },
        {
          title: "Reliable communication",
          description: "Messages, booking updates, and support actions should help customers feel informed instead of uncertain.",
        },
      ],
      quickFacts: [
        { label: "Services", value: String(serviceCount) },
        { label: "Team Members", value: String(staffCount) },
        { label: "Customer Reviews", value: String(reviewCount) },
      ],
      links: [
        ...(website ? [{ label: "Visit website", url: website }] : []),
        ...(salon.address ? [{ label: "Find the salon", url: "app://location" }] : []),
        ...(supportEmail ? [{ label: "Email the team", url: `mailto:${supportEmail}` }] : []),
      ],
      footer: `${appName} content is served dynamically so customers always see the latest salon information and support details.`,
    },
    salon,
  };
}