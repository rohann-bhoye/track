/**
 * Seeds 5 sample firms into the meet_leads collection so the Meet Tracker
 * page has something to show. Safe to re-run: it skips firms already there.
 *
 *   node scripts/seed-meet-tracker.mjs
 *   node scripts/seed-meet-tracker.mjs --clean   (removes only these 5)
 */
import "dotenv/config";
import { config } from "dotenv";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, getDocs, addDoc, deleteDoc, doc, Timestamp,
} from "firebase/firestore";

config({ path: ".env.local", override: true });

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});
const db = getFirestore(app);
const COL = "meet_leads";

const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const shift = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return iso(d);
};

let seq = 0;
const fu = (date, status, note, nextMeetDate, by) => ({
  id: `seed-${Date.now()}-${seq++}`,
  date,
  status,
  note,
  nextMeetDate: nextMeetDate || null,
  by: by || null,
  createdAt: Timestamp.fromDate(new Date(date)),
});

const SAMPLES = [
  {
    firmName: "Shree Sai Interiors",
    contactPerson: "Mahesh Patil",
    metWith: "Ar. Snehal Joshi",
    phone: "+91 98230 41122",
    email: "sales@shreesaiinteriors.in",
    address: "Shop 14, Anand Plaza, College Road",
    city: "Nashik",
    mapLink: "https://www.google.com/maps/search/?api=1&query=College+Road+Nashik",
    source: "JustDial",
    category: "Architect",
    owner: "Rohan",
    dealValue: 45000,
    status: "meeting_fixed",
    nextMeetDate: shift(0),
    lastContactDate: shift(-2),
    notes: "Wants a full social media package before the Diwali season.",
    followUps: [
      fu(shift(-6), "call_pickup", "Picked up. Asked us to call back after 6 pm, he handles marketing himself.", shift(-4), "Rohan"),
      fu(shift(-4), "interested", "Liked the reel samples. Budget around 40k to 50k per month.", shift(-2), "Rohan"),
      fu(shift(-2), "meeting_fixed", "Office visit confirmed. Carry the printed portfolio and rate card.", shift(0), "Rohan"),
    ],
  },
  {
    firmName: "Aroma Cafe and Bakers",
    contactPerson: "Sneha Kulkarni",
    metWith: "",
    phone: "+91 90280 77341",
    email: "",
    address: "Ground Floor, Silver Arcade, Gangapur Road",
    city: "Nashik",
    mapLink: "https://www.justdial.com/Nashik/Aroma-Cafe",
    source: "JustDial",
    category: "Cafe / Restaurant",
    owner: "Rohan",
    dealValue: 18000,
    status: "not_picked",
    nextMeetDate: shift(-1),
    lastContactDate: shift(-1),
    notes: "Peak hours are 5 pm to 9 pm, avoid calling then.",
    followUps: [
      fu(shift(-3), "new", "Number picked from JustDial listing. First attempt not made yet.", shift(-1), "Rohan"),
      fu(shift(-1), "not_picked", "Rang twice, no answer. Try WhatsApp before the next call.", shift(-1), "Rohan"),
    ],
  },
  {
    firmName: "Elegant Woodworks and Contractors",
    contactPerson: "Imran Shaikh",
    metWith: "Imran Shaikh",
    phone: "+91 99700 55210",
    email: "elegantfurniture.nsk@gmail.com",
    address: "Plot 8, MIDC Ambad, Near Pathardi Phata",
    city: "Nashik",
    mapLink: "https://www.google.com/maps/search/?api=1&query=MIDC+Ambad+Nashik",
    source: "Reference",
    category: "Contractor",
    owner: "Rohan",
    dealValue: 75000,
    status: "won",
    nextMeetDate: "",
    lastContactDate: shift(-5),
    notes: "Signed a 3 month retainer. Onboarding call done, content calendar shared.",
    followUps: [
      fu(shift(-16), "call_pickup", "Reference from Mahesh. Sounded positive on the first call.", shift(-12), "Rohan"),
      fu(shift(-12), "demo", "Showed the Wallxy case study at his showroom. He liked the before and after reels.", shift(-8), "Rohan"),
      fu(shift(-8), "interested", "Asked for a written proposal with 3 pricing tiers.", shift(-5), "Rohan"),
      fu(shift(-5), "won", "Closed at 75k for 3 months. Advance received, work starts next Monday.", "", "Rohan"),
    ],
  },
];

SAMPLES.push(
  {
    firmName: "GreenSpace Design Consultants",
    contactPerson: "Priya Deshmukh",
    metWith: "Ar. Priya Deshmukh",
    phone: "+91 88888 31905",
    email: "",
    address: "1st Floor, Ratan Heights, Indira Nagar",
    city: "Nashik",
    mapLink: "https://www.justdial.com/Nashik/Glow-and-Grace-Salon",
    source: "Instagram",
    category: "Consultant",
    owner: "Rohan",
    dealValue: 22000,
    status: "demo",
    nextMeetDate: shift(3),
    lastContactDate: shift(-1),
    notes: "Already posting on Instagram but no consistency. Wants reels plus ads.",
    followUps: [
      fu(shift(-7), "call_pickup", "Spoke to the receptionist, got the owner number.", shift(-4), "Rohan"),
      fu(shift(-4), "interested", "Priya wants to grow bridal bookings. Asked what we did for other salons.", shift(-1), "Rohan"),
      fu(shift(-1), "demo", "Shared a sample reel and a 30 day content plan on WhatsApp. She is reviewing with her partner.", shift(3), "Rohan"),
    ],
  },
  {
    firmName: "Sunrise Builders and Developers",
    contactPerson: "Anil Jadhav",
    metWith: "Ar. Rahul Mehta",
    phone: "+91 94220 66788",
    email: "info@sunrisebuilders.co.in",
    address: "Sunrise House, Sharanpur Link Road",
    city: "Nashik",
    mapLink: "https://www.google.com/maps/search/?api=1&query=Sharanpur+Road+Nashik",
    source: "Cold Call",
    category: "Builder / Developer",
    owner: "Rohan",
    dealValue: null,
    status: "not_interested",
    nextMeetDate: "",
    lastContactDate: shift(-9),
    notes: "Handled by an in house team. Worth revisiting after 6 months.",
    followUps: [
      fu(shift(-13), "call_pickup", "Reached the front desk, they forwarded the call to the marketing head.", shift(-9), "Rohan"),
      fu(shift(-9), "not_interested", "They have an in house marketing team. Asked us to check back after 6 months.", "", "Rohan"),
    ],
  },
);

async function main() {
  const clean = process.argv.includes("--clean");
  const col = collection(db, COL);
  const snap = await getDocs(col);
  const existing = new Map(snap.docs.map((d) => [d.data().firmName, d.id]));
  const names = SAMPLES.map((s) => s.firmName);

  if (clean) {
    let removed = 0;
    for (const name of names) {
      const id = existing.get(name);
      if (id) {
        await deleteDoc(doc(db, COL, id));
        removed++;
        console.log("removed:", name);
      }
    }
    console.log(`\nDone. Removed ${removed} sample firm(s).`);
    process.exit(0);
  }

  let added = 0;
  for (const sample of SAMPLES) {
    if (existing.has(sample.firmName)) {
      console.log("skip (already there):", sample.firmName);
      continue;
    }
    await addDoc(col, {
      ...sample,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      deletedAt: null,
    });
    added++;
    console.log("added:", sample.firmName);
  }
  console.log(`\nDone. ${added} sample firm(s) added to "${COL}".`);
  console.log("Open http://localhost:3000/meet-tracker to see them.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
