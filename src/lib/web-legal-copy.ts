import { APP_DISPLAY_NAME, COMPANY_NAME, CONTACT_EMAIL, CONTACT_PHONE_DISPLAY } from "@/src/lib/brand";

export const PRIVACY_LAST_UPDATED = "July 30, 2026";

export const PRIVACY_INTRO = `${APP_DISPLAY_NAME} (“we”, “us”, or “our”) is operated by ${COMPANY_NAME}. This Privacy Policy explains how we collect, use, and share information when you use the ${APP_DISPLAY_NAME} website and related services.`;

export const PRIVACY_SECTIONS: { title: string; paragraphs: string[] }[] = [
  {
    title: "Information we collect",
    paragraphs: [
      "Account details you provide, such as name, phone number, email address, profile photo, and location notes.",
      "Listing and transaction-related content you submit, including auction photos, descriptions, bids, messages you send through the product, and verification documents when you apply to sell.",
      "Technical and usage information, such as device type, browser, approximate location derived from IP address, and how you interact with pages and features.",
    ],
  },
  {
    title: "How we use information",
    paragraphs: [
      "To create and manage your account, display listings, process bidding activity, and provide customer support.",
      "To operate, secure, and improve the marketplace, including fraud prevention, troubleshooting, and product analytics.",
      "To contact you about your account, listings, bids, or important service updates.",
    ],
  },
  {
    title: "How we share information",
    paragraphs: [
      `${APP_DISPLAY_NAME} is a marketplace platform. Profile and listing information you choose to publish may be visible to other users.`,
      "We use trusted service providers (for example hosting, databases, and analytics) who process data on our behalf under appropriate safeguards.",
      "We may disclose information if required by law, to protect rights and safety, or in connection with a business transfer.",
      `${APP_DISPLAY_NAME} does not sell your personal information.`,
    ],
  },
  {
    title: "Payments and delivery",
    paragraphs: [
      `Payments and delivery are arranged between buyers and sellers. ${APP_DISPLAY_NAME} does not collect or hold auction payments. Information you share directly with another party outside the app is governed by that party’s practices.`,
    ],
  },
  {
    title: "Data retention and security",
    paragraphs: [
      "We keep information for as long as needed to provide the service, meet legal obligations, resolve disputes, and enforce our terms.",
      "We use reasonable technical and organizational measures to protect information, but no method of transmission or storage is completely secure.",
    ],
  },
  {
    title: "Your choices",
    paragraphs: [
      "You may update certain profile details in the app. You may request access, correction, or deletion of personal information where applicable by contacting us.",
      "If you disable notifications or limit permissions on your device, some features may not work as intended.",
    ],
  },
  {
    title: "Children",
    paragraphs: [
      `${APP_DISPLAY_NAME} is not directed to children under 16, and we do not knowingly collect personal information from children.`,
    ],
  },
  {
    title: "Changes",
    paragraphs: [
      "We may update this Privacy Policy from time to time. The “Last updated” date at the top of this page will change when we do. Continued use of the service after updates means you accept the revised policy.",
    ],
  },
  {
    title: "Contact",
    paragraphs: [
      `Questions about privacy: ${CONTACT_EMAIL} or ${CONTACT_PHONE_DISPLAY}.`,
      `Postal / company: ${COMPANY_NAME}.`,
    ],
  },
];

export const SUPPORT_INTRO = `Need help with ${APP_DISPLAY_NAME}? Use the contacts below for account, listing, or general marketplace questions.`;

export const SUPPORT_SECTIONS: { title: string; paragraphs: string[] }[] = [
  {
    title: "Contact support",
    paragraphs: [
      `Email: ${CONTACT_EMAIL}`,
      `Phone: ${CONTACT_PHONE_DISPLAY}`,
      "We typically respond during business hours in the Maldives (UTC+5).",
    ],
  },
  {
    title: "Common topics",
    paragraphs: [
      "Account access — sign-in issues, phone verification, or updating your profile.",
      "Listings & bidding — creating auctions, extending or closing listings, and bid history questions.",
      "Seller verification — document upload status and approval timelines.",
      `Payments & delivery — ${APP_DISPLAY_NAME} connects buyers and sellers but does not process auction payments or arrange delivery. Contact the other party for payment and handoff details.`,
    ],
  },
  {
    title: "Before you write",
    paragraphs: [
      "Include your registered phone number, the auction title or link if relevant, and a short description of the issue. That helps us respond faster.",
    ],
  },
  {
    title: "Safety",
    paragraphs: [
      `Never share one-time codes, passwords, or payment credentials with anyone claiming to be ${APP_DISPLAY_NAME} support outside the official contacts on this page.`,
    ],
  },
];
