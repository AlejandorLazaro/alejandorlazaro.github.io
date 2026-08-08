import { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "motion/react";
import { Heart, X, Star, Send, MapPin, Image as ImageIcon, Gamepad2 } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// ─── Data ────────────────────────────────────────────────────────────────────

interface Profile {
  id: number;
  version: string;
  name: string;
  subtitle: string;
  location: string;
  photo: string;
  bio: string;
  tags: string[];
  prompt: string;
  answer: string;
}

const PROFILES: Profile[] = [
  {
    id: 1,
    version: "The Singer",
    name: "Alejandro",
    subtitle: '33 yrs of "Always down for karaoke"',
    location: "Humble, TX | Where the mic's at",
    photo: "/assets/img/match/mic.jpeg",
    bio: "Never shies away from a microphone, a duet, or a party anthem!",
    tags: ["John Legend", "Coldplay", "Switchfoot", "The Killers"],
    prompt: "Wake me up:",
    answer: "Before you go, go!",
  },
  {
    id: 2,
    version: "The Gym-Goer",
    name: "Alejandro",
    subtitle: "Aesthetics *and* better health? Why not!",
    location: "Humble, TX | Away from the treadmill",
    photo: "/assets/img/match/mirror2.jpeg",
    bio: "I would've complimented you first, but I'm shy (and don't want to get banned from EōS)",
    tags: ["Fitness", "Calisthenics", "Discipline", "Dates that move"],
    prompt: "Train-or-date?",
    answer: "Either. Preferably both—then we grab Chipotle!",
  },
  {
    id: 7,
    version: "The Party Connector",
    name: "Alejandro",
    subtitle: "People hype-r · flirts with chaos",
    location: "Humble, TX",
    photo: "/assets/img/match/party.jpeg",
    bio: "The man (without) a plan, but the fun never stops! Variety is the spice of life! 💃🕺",
    tags: ["Friends", "Events", "Host energy", "Fun-first"],
    prompt: "My claim to party fame:",
    answer: "MC'd my sisters wedding... in two languages!",
  },
  {
    id: 8,
    version: "The Little Gamer",
    name: "Alejandro",
    subtitle: "Co-op > competitiveness",
    location: "Humble, TX",
    photo: "/assets/img/match/hair.jpeg",
    bio: "Long-time solo player, but love a good co-op! Let's have fun together and make memories!",
    tags: ["Co-op", "Nintendo", "Smash Bros", "Play", "Board Games"],
    prompt: "Gaming red flag:",
    answer: "Ending my longest road streak in Catan.",
  },
  {
    id: 9,
    version: "The Kid-at-Heart",
    name: "Alejandro",
    subtitle: "24/7 imagination · childlike wonder",
    location: "Humble, TX",
    photo: "/assets/img/match/upsidedown.jpeg",
    bio: "Playgrounds, cartwheels, and Lunchables. Real kids, kids at heart, we're all children of heaven!",
    tags: ["Play", "Adventures", "Curiosity", "Big goofy grin"],
    prompt: "How I know we'll click:",
    answer: "If we can laugh at something stupid and still feel safe doing it.",
  },
  {
    id: 10,
    version: "The Automator",
    name: "Alejandro",
    subtitle: "Builds fast · breaks things",
    location: "Humble, TX | tokens == Chuck-E-Cheese",
    photo: "/assets/img/match/rainbow.jpeg",
    bio: "Coding is a necessary evil to bring about wondrous magic! :(){ :|:& };:",
    tags: ["Techie", "Nerd", "Systematic approach", "KISS it til it's DRY", "Sunday is for REST"],
    prompt: "My dating promise:",
    answer: "I'll stop trying to explain code principles if you say you aren't interested.",
  },
  {
    id: 11,
    version: "The Supporter",
    name: "Alejandro",
    subtitle: "Romance—it's love that's sacrificial",
    location: "Humble, TX | or wherever the heart lies",
    photo: "/assets/img/match/drama.jpeg",
    bio: "I'll be wherever you need me to be, ready to support you in both light and heavy burdens.",
    tags: ["Servant hearted", "Playful intimacy", "Love is patient", "Love is kind"],
    prompt: "Green flag on a first date:",
    answer: "You're bold enough to be real—and calm enough to be kind.",
  },
];

const HEARTS = [
  { left: "8%", top: "12%", delay: 0, size: "text-3xl" },
  { left: "82%", top: "8%", delay: 0.6, size: "text-5xl" },
  { left: "15%", top: "70%", delay: 1.1, size: "text-2xl" },
  { left: "88%", top: "65%", delay: 0.3, size: "text-4xl" },
  { left: "45%", top: "5%", delay: 0.9, size: "text-3xl" },
  { left: "70%", top: "80%", delay: 0.15, size: "text-2xl" },
  { left: "28%", top: "88%", delay: 0.7, size: "text-4xl" },
  { left: "55%", top: "78%", delay: 0.45, size: "text-3xl" },
];

// ─── SwipeCard ────────────────────────────────────────────────────────────────

interface CardHandle {
  triggerSwipe: (dir: "left" | "right") => Promise<void>;
}

const SwipeCard = forwardRef<CardHandle, {
  profile: Profile;
  onExited: (dir: "left" | "right") => void;
}>(({ profile, onExited }, ref) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-280, 0, 280], [-18, 0, 18]);
  const likeOpacity = useTransform(x, [30, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, -30], [1, 0]);
  const likeScale = useTransform(x, [30, 100], [0.7, 1]);
  const nopeScale = useTransform(x, [-100, -30], [1, 0.7]);

  const exit = useCallback(async (dir: "left" | "right") => {
    await animate(x, dir === "right" ? 820 : -820, {
      duration: 0.32,
      ease: [0.4, 0, 1, 1],
    });
    onExited(dir);
  }, [x, onExited]);

  useImperativeHandle(ref, () => ({ triggerSwipe: exit }), [exit]);

  const handleDragEnd = useCallback(async (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x > 90) {
      await exit("right");
    } else if (info.offset.x < -90) {
      await exit("left");
    } else {
      animate(x, 0, { type: "spring", stiffness: 420, damping: 32 });
    }
  }, [exit, x]);

  return (
    <motion.div
      className="absolute inset-0 select-none cursor-grab active:cursor-grabbing"
      style={{ x, rotate, zIndex: 3 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.85}
      onDragEnd={handleDragEnd}
    >
      {/* LIKE stamp */}
      <motion.div
        className="absolute top-8 left-5 z-20 border-[3px] border-emerald-500 rounded-md px-3 py-1 -rotate-12 pointer-events-none"
        style={{ opacity: likeOpacity, scale: likeScale }}
      >
        <span className="font-mono font-bold text-xl text-emerald-500 tracking-[0.15em]">LIKE</span>
      </motion.div>

      {/* NOPE stamp */}
      <motion.div
        className="absolute top-8 right-5 z-20 border-[3px] border-[#FF3B5C] rounded-md px-3 py-1 rotate-12 pointer-events-none"
        style={{ opacity: nopeOpacity, scale: nopeScale }}
      >
        <span className="font-mono font-bold text-xl text-[#FF3B5C] tracking-[0.15em]">NOPE</span>
      </motion.div>

      {/* Card */}
      <div className="w-full h-full bg-card rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Photo */}
        <div className="relative flex-[11] bg-stone-200 overflow-hidden min-h-0">
          <img
            src={profile.photo}
            alt={`${profile.name} — ${profile.version}`}
            className="w-full h-full object-cover"
            draggable={false}
          />

          {/* Version badge */}
          <div className="absolute top-4 left-4 bg-black/78 backdrop-blur-sm px-3 py-1.5">
            <span className="font-mono text-[10px] text-white uppercase tracking-[0.22em]">
              {profile.version}
            </span>
          </div>

          {/* Gradient → name */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/75 to-transparent" />
          <div className="absolute bottom-4 left-5 right-5">
            <h2 className="font-display text-[1.65rem] font-semibold text-white leading-tight">
              {profile.name}
            </h2>
            <p className="text-white/72 text-sm font-sans mt-0.5">{profile.subtitle}</p>
          </div>
        </div>

        {/* Info */}
        <div className="flex-[7] px-5 py-4 flex flex-col gap-2.5 min-h-0 overflow-hidden">
          <div className="flex items-center gap-1.5 text-stone-400 text-sm font-sans">
            <MapPin size={12} strokeWidth={2.5} />
            <span>{profile.location}</span>
          </div>

          <p className="text-stone-600 text-sm leading-relaxed line-clamp-2 font-sans">{profile.bio}</p>

          <div className="flex flex-wrap gap-1.5">
            {profile.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-0.5 bg-stone-100 text-stone-500 text-[11px] font-mono rounded-sm"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-auto pt-2.5 border-t border-stone-100">
            <p className="text-stone-400 text-[10px] font-mono uppercase tracking-[0.18em]">{profile.prompt}</p>
            <p className="text-stone-700 text-sm italic font-sans mt-0.5">
              &ldquo;{profile.answer}&rdquo;
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

SwipeCard.displayName = "SwipeCard";

// ─── Match Overlay ────────────────────────────────────────────────────────────

function MatchOverlay({
  profile,
  onMessage,
  onContinue,
}: {
  profile: Profile;
  onMessage: () => void;
  onContinue: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-8"
      style={{ background: "linear-gradient(155deg, #FF3B5C 0%, #FF6B35 100%)" }}
    >
      {/* Decorative hearts */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {HEARTS.map((h, i) => (
          <motion.span
            key={i}
            className={`absolute text-white/20 ${h.size}`}
            style={{ left: h.left, top: h.top }}
            animate={{ y: [-14, 14, -14], rotate: [-8, 8, -8], opacity: [0.12, 0.28, 0.12] }}
            transition={{ duration: 3.5 + i * 0.3, repeat: Infinity, delay: h.delay, ease: "easeInOut" }}
          >
            ♥
          </motion.span>
        ))}
      </div>

      {/* Content */}
      <motion.div
        initial={{ scale: 0.55, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15, type: "spring", stiffness: 180, damping: 18 }}
        className="flex flex-col items-center text-center z-10"
      >
        <span className="font-mono text-white/65 text-xs uppercase tracking-[0.26em] mb-5">
          It&apos;s a Match
        </span>

        <div className="relative mb-7">
          <div className="w-28 h-28 rounded-full border-[3px] border-white/50 overflow-hidden shadow-2xl">
            <img src={profile.photo} alt={profile.name} className="w-full h-full object-cover" />
          </div>
          <motion.div
            className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
          >
            <Heart size={18} fill="#FF3B5C" className="text-[#FF3B5C]" />
          </motion.div>
        </div>

        <h2 className="font-display text-[2.4rem] font-bold text-white leading-tight mb-2">
          Alejandro likes you!
        </h2>
        <p className="text-white/78 text-base font-sans max-w-[260px] leading-relaxed">
          {profile.version} Alejandro thinks you two would get along.
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 36, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.48 }}
        className="flex flex-col gap-3 w-full max-w-[280px] mt-10 z-10"
      >
        <button
          onClick={onMessage}
          className="w-full py-4 bg-white text-[#FF3B5C] font-semibold rounded-2xl text-[15px] shadow-lg hover:bg-white/95 transition-colors flex items-center justify-center gap-2"
        >
          <Send size={15} />
          Send a Message
        </button>
        <button
          onClick={onContinue}
          className="w-full py-4 border-2 border-white/40 text-white font-medium rounded-2xl text-[15px] hover:bg-white/10 transition-colors"
        >
          Keep Exploring
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Match Toast (repeat matches, non-blocking) ───────────────────────────────

function MatchToast({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [profile, onClose]);

  return (
    <motion.div
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -60, opacity: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className="fixed top-4 inset-x-4 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-2xl bg-stone-900 px-4 py-3 shadow-xl cursor-pointer"
      onClick={onClose}
    >
      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 border-white/20">
        <img src={profile.photo} alt={profile.version} className="w-full h-full object-cover" />
      </div>
      <div className="min-w-0">
        <p className="text-white text-sm font-semibold leading-tight">New match!</p>
        <p className="text-white text-xs font-sans truncate">{profile.version} liked you back</p>
      </div>
      <Heart size={16} fill="#FF3B5C" className="text-[#FF3B5C] ml-auto shrink-0" />
    </motion.div>
  );
}

// ─── Message Modal ────────────────────────────────────────────────────────────

// NOTE: these are hardcoded to match what's currently deployed. Since this is
// a Supabase anon/publishable key it's safe to ship client-side, but consider
// moving these to import.meta.env.VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
// so they're not sitting in source control, and double-check your RLS policy
// on `messages` only allows inserts (not select/update/delete) for the anon role.
const SUPABASE_URL = "https://szsvmzfcujqfqngnqjau.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6c3ZtemZjdWpxZnFuZ25xamF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MzYyMTIsImV4cCI6MjA3MTMxMjIxMn0.7tu5hHmCGqUhxJwVMR3AMAULB6t-3AkBWqeYvl8uoAo";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Minimum time a visitor must wait between message submissions.
const MESSAGE_COOLDOWN_MS = 100 * 1000; // 100 seconds

// Photo upload constraints. Mirror these in the Supabase bucket settings too
// (Storage → match-uploads → allowed MIME types / file size limit) since a
// client-side check alone can be bypassed by anyone calling the API directly
// with the same anon key that ships in this bundle.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function MessageModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      alert("Please choose a JPEG, PNG, WEBP, or GIF image.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      alert("That image is too large — please choose one under 5MB.");
      e.target.value = "";
      return;
    }
    setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Rate limiting check
    const lastSent = localStorage.getItem("last_message_time");
    const now = Date.now();

    if (lastSent && now - parseInt(lastSent, 10) < MESSAGE_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil(
        (MESSAGE_COOLDOWN_MS - (now - parseInt(lastSent, 10))) / 1000
      );
      alert(
        `Whoa there, speed racer! I'm flattered, but please wait ${remainingSeconds} seconds before sending another message.`
      );
      return;
    }

    try {
      let imageUrl: string | null = null;

      if (selectedFile) {
        // Randomized filename avoids collisions if two uploads land in the
        // same millisecond (e.g. a double-click).
        const ext = selectedFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const fileName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("match-uploads")
          .upload(fileName, selectedFile, {
            contentType: selectedFile.type,
            upsert: false,
          });

        if (uploadError) {
          console.error("Error uploading photo:", uploadError);
          alert("Couldn't upload your photo, but I'll still send your message.");
        } else {
          const { data: publicUrlData } = supabase.storage
            .from("match-uploads")
            .getPublicUrl(fileName);
          imageUrl = publicUrlData.publicUrl;
        }
      }

      const { error: insertError } = await supabase.from("messages").insert({
        name: form.name,
        email: form.email,
        message: form.message,
        image_url: imageUrl,
      });

      if (insertError) {
        alert("Failed to send message. Please try again.");
        return;
      }

      // Stamp the successful submission time into local storage
      localStorage.setItem("last_message_time", Date.now().toString());
      setSent(true); // Only show the success screen if Supabase accepted it
      onSent();
    } catch (err) {
      console.error("Error submitting message:", err);
      alert("Network error. Please check your connection.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/55 flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
        className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md"
      >
        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center py-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
                className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-5"
              >
                <span className="text-2xl">✓</span>
              </motion.div>
              <h3 className="font-display text-2xl font-semibold text-stone-900 mb-2">Message sent!</h3>
              <p className="text-stone-500 text-sm font-sans mb-8">Alejandro will get back to you soon.</p>
              <button
                onClick={onClose}
                className="w-full py-3.5 bg-stone-900 text-white font-medium rounded-2xl hover:bg-stone-800 transition-colors"
              >
                Done
              </button>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-display text-xl font-semibold text-stone-900">Say hello to Alejandro</h3>
                  <p className="text-stone-400 text-xs font-sans mt-0.5">Responds within 24 hours</p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-stone-400 mb-1.5">
                    Your name
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Jane Smith"
                    className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 font-sans placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-[#FF3B5C]/25 focus:border-[#FF3B5C]/60 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-stone-400 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="jane@example.com"
                    className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 font-sans placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-[#FF3B5C]/25 focus:border-[#FF3B5C]/60 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-stone-400 mb-1.5">
                    Message
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    placeholder="I came across your profile and wanted to reach out about..."
                    className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 font-sans placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-[#FF3B5C]/25 focus:border-[#FF3B5C]/60 transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-stone-400 mb-1.5">
                    Photo <span className="normal-case text-stone-300">(optional)</span>
                  </label>
                  <label className="flex items-center gap-2 w-full border border-dashed border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-400 font-sans cursor-pointer hover:border-stone-300 hover:text-stone-500 transition-colors">
                    <ImageIcon size={16} strokeWidth={2} />
                    <span className="flex-1 truncate">
                      {selectedFile ? selectedFile.name : "Attach a photo"}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#FF3B5C] text-white font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-[#E8344F] transition-colors shadow-md shadow-[#FF3B5C]/20 text-[15px]"
                >
                  <Send size={15} />
                  Send to Alejandro
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({
  matches,
  hasMessaged,
  onMessage,
}: {
  matches: Profile[];
  hasMessaged: boolean;
  onMessage: () => void;
}) {
  const showMessageCta = !hasMessaged;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center h-full text-center px-8"
    >
      <div className="w-20 h-20 rounded-full bg-stone-100 flex items-center justify-center mb-6">
        <span className="text-3xl">✦</span>
      </div>
      <h3 className="font-display text-2xl font-bold text-stone-800 mb-2">
        You&apos;ve seen all sides
      </h3>

      {/* Match stats summary */}
      {matches.length > 0 ? (
        <>
          <div className="flex -space-x-3 mb-4">
            {matches.slice(0, 6).map((m, i) => (
              <div
                key={`${m.id}-${i}`}
                className="w-11 h-11 rounded-full border-2 border-white overflow-hidden shadow-md"
              >
                <img src={m.photo} alt={m.version} className="w-full h-full object-cover" />
              </div>
            ))}
            {matches.length > 6 && (
              <div className="w-11 h-11 rounded-full border-2 border-white bg-stone-800 text-white text-xs font-mono flex items-center justify-center shadow-md">
                +{matches.length - 6}
              </div>
            )}
          </div>
          <p className="text-stone-400 text-sm font-sans max-w-[260px] leading-relaxed mb-8">
            {matches.length} match{matches.length === 1 ? "" : "es"} out of {PROFILES.length} versions of Alejandro.
            {hasMessaged ? " Alejandro will get back to you soon." : ""}
          </p>
        </>
      ) : (
        <p className="text-stone-400 text-sm font-sans max-w-[240px] leading-relaxed mb-8">
          You explored every version of Alejandro. Ready to reach out?
        </p>
      )}

      {showMessageCta && (
        <button
          onClick={onMessage}
          className="px-8 py-3.5 bg-stone-900 text-white font-medium rounded-2xl flex items-center gap-2 hover:bg-stone-700 transition-colors text-[15px]"
        >
          <Send size={15} />
          Connect with Alejandro
        </button>
      )}

      <a
        href="https://alejandorlazaro.github.io/block_game.html"
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-2 text-stone-400 text-sm font-sans hover:text-stone-600 transition-colors ${
          showMessageCta ? "mt-4" : "mt-2"
        }`}
      >
        <Gamepad2 size={15} />
        Looking for more fun? Try the puzzle game!
      </a>
    </motion.div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matches, setMatches] = useState<Profile[]>([]);
  const [matchOverlayProfile, setMatchOverlayProfile] = useState<Profile | null>(null);
  const [matchToast, setMatchToast] = useState<Profile | null>(null);
  const [showMessage, setShowMessage] = useState(false);
  const [hasMessaged, setHasMessaged] = useState(false);
  const cardRef = useRef<CardHandle>(null);
  const idxRef = useRef(0);
  const matchesRef = useRef<Profile[]>([]);

  const handleExited = useCallback((dir: "left" | "right") => {
    const idx = idxRef.current;
    if (dir === "right") {
      const profile = PROFILES[idx];
      const isFirstMatch = matchesRef.current.length === 0;
      matchesRef.current = [...matchesRef.current, profile];
      setMatches(matchesRef.current);

      // Only the very first match gets the full-screen takeover — anything
      // after that is a quick non-blocking toast so swiping doesn't keep
      // getting interrupted.
      if (isFirstMatch) {
        setMatchOverlayProfile(profile);
      } else {
        setMatchToast(profile);
      }
    }
    idxRef.current = idx + 1;
    setCurrentIndex(idx + 1);
  }, []);

  const swipe = (dir: "left" | "right") => cardRef.current?.triggerSwipe(dir);

  const allDone = currentIndex >= PROFILES.length;
  const activeProfile = PROFILES[currentIndex];

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden font-sans">

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-5 py-3.5 border-b border-border/60 shrink-0">
        <span className="font-display text-[1.45rem] font-bold text-foreground tracking-tight">
          Alejandro.
        </span>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          {PROFILES.map((_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === currentIndex ? 24 : 16,
                background:
                  i < currentIndex
                    ? "#D0CEC9"
                    : i === currentIndex
                    ? "#FF3B5C"
                    : "#E5E3DE",
              }}
            />
          ))}
        </div>

        <span className="font-mono text-xs text-muted-foreground">
          {Math.min(currentIndex + 1, PROFILES.length)}&thinsp;/&thinsp;{PROFILES.length}
        </span>
      </header>

      {/* ── Card Area ── */}
      <div className="flex-1 flex items-center justify-center px-4 py-3 overflow-visible min-h-0">
        {allDone ? (
          <EmptyState
            matches={matches}
            hasMessaged={hasMessaged}
            onMessage={() => setShowMessage(true)}
          />
        ) : (
          <div
            className="relative w-full max-w-[340px]"
            style={{ height: "min(560px, calc(100dvh - 200px))" }}
          >
            {/* Back card 3 */}
            {PROFILES[currentIndex + 2] && (
              <div
                className="absolute bg-card rounded-3xl"
                style={{
                  left: 16,
                  right: 16,
                  top: 20,
                  bottom: -20,
                  zIndex: 1,
                  boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
                }}
              />
            )}
            {/* Back card 2 */}
            {PROFILES[currentIndex + 1] && (
              <div
                className="absolute bg-card rounded-3xl"
                style={{
                  left: 8,
                  right: 8,
                  top: 10,
                  bottom: -10,
                  zIndex: 2,
                  boxShadow: "0 3px 20px rgba(0,0,0,0.09)",
                }}
              />
            )}
            {/* Top swipeable card */}
            <SwipeCard
              key={currentIndex}
              ref={cardRef}
              profile={activeProfile}
              onExited={handleExited}
            />
          </div>
        )}
      </div>

      {/* ── Action Bar ── */}
      {!allDone && (
        <div className="flex items-center justify-center gap-5 py-5 border-t border-border/50 shrink-0">
          {/* Nope */}
          <motion.button
            onClick={() => swipe("left")}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
            className="w-[60px] h-[60px] rounded-full border-2 border-stone-200 bg-card flex items-center justify-center shadow-md"
          >
            <X size={22} className="text-stone-500" strokeWidth={2.5} />
          </motion.button>

          {/* Super like */}
          <motion.button
            onClick={() => swipe("right")}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
            className="w-[52px] h-[52px] rounded-full border-2 border-amber-300 bg-card flex items-center justify-center shadow-md"
            title="Super Like"
          >
            <Star size={18} className="text-amber-400" strokeWidth={2} />
          </motion.button>

          {/* Like */}
          <motion.button
            onClick={() => swipe("right")}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
            className="w-[60px] h-[60px] rounded-full bg-[#FF3B5C] flex items-center justify-center shadow-lg shadow-[#FF3B5C]/30"
          >
            <Heart size={22} fill="white" className="text-white" />
          </motion.button>
        </div>
      )}

      {/* ── Overlays ── */}
      <AnimatePresence>
        {matchOverlayProfile && !showMessage && (
          <MatchOverlay
            key="match"
            profile={matchOverlayProfile}
            onMessage={() => {
              setMatchOverlayProfile(null);
              setShowMessage(true);
            }}
            onContinue={() => setMatchOverlayProfile(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {matchToast && (
          <MatchToast
            key={`toast-${matchToast.id}`}
            profile={matchToast}
            onClose={() => setMatchToast(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMessage && (
          <MessageModal
            key="message"
            onClose={() => setShowMessage(false)}
            onSent={() => setHasMessaged(true)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}