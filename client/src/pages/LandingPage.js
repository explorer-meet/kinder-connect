import React from 'react';
import { Link } from 'react-router-dom';
import {
  FaAppleAlt,
  FaArrowRight,
  FaBell,
  FaBookOpen,
  FaCalendarCheck,
  FaChartLine,
  FaCheckCircle,
  FaChild,
  FaClipboardList,
  FaComments,
  FaHeart,
  FaLayerGroup,
  FaPuzzlePiece,
  FaShieldAlt,
  FaStar,
  FaUserFriends,
} from 'react-icons/fa';

const quickStats = [
  { value: '1 Platform', label: 'For school admins, teachers, and parents' },
  { value: 'Daily Flow', label: 'Attendance, updates, circulars, and reports' },
  { value: 'Real-time', label: 'Parent visibility without message chaos' },
];

const featureCards = [
  {
    icon: FaBell,
    title: 'Circulars That Actually Reach Everyone',
    description: 'Publish once and deliver updates to teachers and parents from the same school workspace.',
  },
  {
    icon: FaClipboardList,
    title: 'Attendance And Activity In One Rhythm',
    description: 'Capture attendance, classroom moments, and daily logs without bouncing between disconnected tools.',
  },
  {
    icon: FaChartLine,
    title: 'Progress Parents Can Understand',
    description: 'Translate milestone tracking and monthly reporting into clear, reassuring child progress snapshots.',
  },
  {
    icon: FaComments,
    title: 'Cleaner Parent Communication',
    description: 'Replace scattered chat threads with structured communication linked to the child and classroom context.',
  },
];

const workflowSteps = [
  {
    step: '01',
    title: 'Set up the school',
    text: 'Create the school workspace, add staff, define classes and batches, and keep the structure simple.',
  },
  {
    step: '02',
    title: 'Run daily operations',
    text: 'Teachers mark attendance, log activities, publish classroom notes, and keep the day visible in real time.',
  },
  {
    step: '03',
    title: 'Keep parents informed',
    text: 'Parents see attendance, circulars, activity feed updates, and child-specific information in one place.',
  },
  {
    step: '04',
    title: 'Track growth over time',
    text: 'Schools build consistent progress records instead of scrambling to assemble information at reporting time.',
  },
];

const rolePanels = [
  {
    title: 'School Admin',
    icon: FaLayerGroup,
    tone: 'from-[#0f766e] to-[#155e75]',
    items: ['Add staff', 'Create classes and batches', 'Enroll students', 'Publish circulars'],
  },
  {
    title: 'Teacher',
    icon: FaBookOpen,
    tone: 'from-[#c2410c] to-[#ea580c]',
    items: ['Mark attendance', 'Log activities', 'Track milestones', 'Prepare reports'],
  },
  {
    title: 'Parent',
    icon: FaUserFriends,
    tone: 'from-[#1d4ed8] to-[#2563eb]',
    items: ['View child profile', 'Check attendance', 'Read circulars', 'Follow daily updates'],
  },
];

const trustPoints = [
  'Purpose-built for preschool and kindergarten operations',
  'Structured around actual school roles instead of generic office workflows',
  'Designed to reduce manual follow-up and status-check calls',
  'Simple enough for daily use, rich enough for school-wide visibility',
];

const playfulStickers = [
  { icon: FaStar, label: 'Creativity', tone: 'from-[#fef3c7] to-[#fed7aa]', text: 'text-[#b45309]', motion: 'landing-sticker-float-a' },
  { icon: FaPuzzlePiece, label: 'Discovery', tone: 'from-[#dbeafe] to-[#bfdbfe]', text: 'text-[#1d4ed8]', motion: 'landing-sticker-float-b' },
  { icon: FaAppleAlt, label: 'Healthy Habits', tone: 'from-[#dcfce7] to-[#bbf7d0]', text: 'text-[#15803d]', motion: 'landing-sticker-float-c' },
  { icon: FaChild, label: 'Happy Kids', tone: 'from-[#ffe4e6] to-[#fecdd3]', text: 'text-[#be123c]', motion: 'landing-sticker-float-d' },
];

const playfulHighlights = [
  { icon: FaBookOpen, text: 'Story circle moments' },
  { icon: FaPuzzlePiece, text: 'Hands-on play tasks' },
  { icon: FaStar, text: 'Milestone cheer-ups' },
  { icon: FaBell, text: 'Parent-ready updates' },
  { icon: FaCalendarCheck, text: 'Routine that feels calm' },
  { icon: FaHeart, text: 'Care-first communication' },
];

export default function LandingPage() {
  return (
    <div className="landing-page min-h-screen overflow-x-hidden bg-[#f7f4ec] text-slate-900">
      <div className="landing-mesh pointer-events-none absolute inset-0 opacity-90" />
      <div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl landing-orb-a" />
      <div className="pointer-events-none absolute right-0 top-1/3 h-72 w-72 rounded-full bg-orange-300/20 blur-3xl landing-orb-b" />
      <div className="pointer-events-none absolute bottom-16 left-1/3 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl landing-orb-c" />

      <header className="relative z-10 px-4 pt-5 sm:px-6 lg:px-10 landing-reveal">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 rounded-3xl border border-white/60 bg-white/70 px-4 py-3 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:rounded-full sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0f766e] via-[#1d4ed8] to-[#f97316] text-lg font-bold text-white shadow-lg shadow-cyan-900/20">
              KC
            </div>
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">Kinder Connect</div>
              <div className="hidden text-sm text-slate-700 sm:block">Modern operations for early childhood schools</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:inline-flex">
              Sign In
            </Link>
            <Link to="/register" className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
              Register School <FaArrowRight className="text-xs" />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 px-4 pb-16 pt-8 sm:px-6 lg:px-10 lg:pb-24 lg:pt-10">
        <section className="mx-auto grid max-w-7xl items-start gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 landing-reveal landing-reveal-delay-1">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#fdba74] bg-[#fff4e6] px-4 py-2 text-sm font-semibold text-[#c2410c] shadow-sm">
              <FaHeart /> Built for warm, well-run school experiences
            </div>

            <p className="mt-3 text-sm font-medium text-[#0f766e]">Modern operations for early childhood schools</p>

            <h1 className="mt-6 max-w-4xl font-display text-4xl font-bold leading-[0.98] tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-7xl">
              The kinder school platform that feels as thoughtful as the care you provide.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              Kinder Connect brings school operations, teacher updates, and parent visibility into one calm, polished workspace so daily care feels organized instead of reactive.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#0f766e] via-[#1d4ed8] to-[#f97316] px-7 py-4 text-base font-semibold text-white shadow-2xl shadow-cyan-900/20 transition hover:-translate-y-0.5">
                Get Started For School <FaArrowRight className="text-sm" />
              </Link>
              <Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-7 py-4 text-base font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50">
                Open Existing Workspace
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {quickStats.map((stat) => (
                <div key={stat.label} className="rounded-3xl border border-white/70 bg-white/75 p-5 shadow-lg shadow-slate-200/60 backdrop-blur-sm">
                  <div className="text-xl font-bold text-slate-900">{stat.value}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {playfulHighlights.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.text} className="landing-chip inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/85 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-sm">
                    <Icon className="text-[#f97316]" />
                    {item.text}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative">
            <div className="relative z-20 mb-4 grid grid-cols-2 gap-3 md:mb-5">
              {playfulStickers.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className={`rounded-2xl border border-white/90 bg-gradient-to-br ${item.tone} px-4 py-3 shadow-lg ${item.motion}`}>
                    <div className={`inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 ${item.text}`}>
                      <Icon />
                    </div>
                    <p className="mt-2 text-xs font-bold tracking-wide text-slate-700">{item.label}</p>
                  </div>
                );
              })}
            </div>

            <div className="absolute -left-6 top-10 h-36 w-36 rounded-full bg-[#fdba74]/50 blur-3xl" />
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#60a5fa]/40 blur-3xl" />

            <div className="relative rounded-[2rem] border border-white/70 bg-[#0f172a] p-5 shadow-[0_30px_80px_rgba(15,23,42,0.28)] sm:p-6">
              <div className="rounded-[1.5rem] bg-gradient-to-br from-[#102542] via-[#143f6b] to-[#0f766e] p-5 text-white sm:p-6">
                <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <div className="text-xs uppercase tracking-[0.28em] text-cyan-100/80">Daily Pulse</div>
                    <div className="mt-2 text-2xl font-bold">Kinder Connect Live Board</div>
                  </div>
                  <div className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">School-wide</div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl bg-white/10 p-4 backdrop-blur-sm">
                    <div className="flex items-center gap-3 text-cyan-100">
                      <FaCalendarCheck />
                      <span className="text-sm font-semibold">Attendance Ready</span>
                    </div>
                    <div className="mt-4 text-3xl font-bold">98%</div>
                    <div className="mt-1 text-sm text-cyan-50/80">Marked before morning circle</div>
                  </div>
                  <div className="rounded-3xl bg-[#fff7ed] p-4 text-slate-900">
                    <div className="flex items-center gap-3 text-[#c2410c]">
                      <FaChild />
                      <span className="text-sm font-semibold">Parent Feed</span>
                    </div>
                    <div className="mt-4 text-3xl font-bold">24</div>
                    <div className="mt-1 text-sm text-slate-600">New classroom moments shared today</div>
                  </div>
                </div>

                <div className="mt-5 rounded-[1.5rem] bg-white p-5 text-slate-900">
                  <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <div className="text-sm font-semibold text-slate-500">What schools manage here</div>
                      <div className="mt-1 text-xl font-bold">Operations, communication, progress</div>
                    </div>
                    <FaShieldAlt className="text-2xl text-[#1d4ed8]" />
                  </div>

                  <div className="mt-5 grid gap-3">
                    {[
                      'Create classes, batches, and student records',
                      'Push circulars to teachers and parents instantly',
                      'Track milestones and attendance without duplicate entry',
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                        <FaCheckCircle className="mt-1 text-[#0f766e]" />
                        <span className="text-sm leading-6 text-slate-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-7xl landing-reveal landing-reveal-delay-2">
          <div className="rounded-[2rem] border border-white/80 bg-white/70 p-4 shadow-xl shadow-slate-200/60 backdrop-blur-sm sm:p-5">
            <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-[#fef3c7] via-[#dbeafe] to-[#dcfce7] px-2 py-3 sm:px-4">
              <div className="landing-marquee-track flex items-center gap-3 whitespace-nowrap">
              {playfulHighlights.concat(playfulHighlights).map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={`${item.text}-${index}`} className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                    <Icon className="text-[#1d4ed8]" />
                    {item.text}
                  </div>
                );
              })}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-7xl lg:mt-24 landing-reveal landing-reveal-delay-2">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#0f766e]">Why it works</p>
              <h2 className="mt-3 max-w-3xl text-4xl font-bold tracking-[-0.04em] text-slate-950">
                One product surface for the people who run the school and the families who trust it.
              </h2>
            </div>
            <p className="max-w-xl text-base leading-7 text-slate-600">
              Kinder Connect is designed around the rhythm of a real preschool day, not adapted from a generic admin dashboard.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {featureCards.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="group rounded-[1.75rem] border border-white/70 bg-white/80 p-6 shadow-lg shadow-slate-200/50 transition hover:-translate-y-1 hover:shadow-2xl">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#eff6ff] to-[#ffedd5] text-2xl text-[#1d4ed8]">
                    <Icon />
                  </div>
                  <h3 className="mt-5 text-xl font-bold text-slate-900">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-7xl rounded-[2rem] bg-[#fffaf3] p-6 shadow-xl shadow-orange-100/60 ring-1 ring-[#fed7aa] lg:mt-24 lg:p-8 landing-reveal landing-reveal-delay-3">
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#c2410c]">Role clarity</p>
              <h2 className="mt-3 text-4xl font-bold tracking-[-0.04em] text-slate-950">Every role sees the right layer of the same school story.</h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Admins organize the institution, teachers keep the day moving, and parents receive the updates that matter without noise.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {rolePanels.map((panel) => {
                const Icon = panel.icon;
                return (
                  <div key={panel.title} className="rounded-[1.75rem] bg-white p-5 shadow-lg shadow-orange-100/50 ring-1 ring-slate-100">
                    <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${panel.tone} text-lg text-white`}>
                      <Icon />
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-slate-900">{panel.title}</h3>
                    <div className="mt-4 space-y-3">
                      {panel.items.map((item) => (
                        <div key={item} className="flex items-center gap-3 text-sm text-slate-600">
                          <span className="h-2 w-2 rounded-full bg-slate-900" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-7xl lg:mt-24 landing-reveal landing-reveal-delay-4">
          <div className="mb-8 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#1d4ed8]">Operational flow</p>
            <h2 className="mt-3 text-4xl font-bold tracking-[-0.04em] text-slate-950">A calmer school day starts with a cleaner system.</h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            {workflowSteps.map((step) => (
              <div key={step.step} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-300/20">
                <div className="inline-flex px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold tracking-[0.22em]">{step.step}</div>
                <h3 className="mt-5 text-2xl font-bold text-slate-900">{step.title}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-700">{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-7xl lg:mt-24 landing-reveal landing-reveal-delay-4">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[2rem] bg-gradient-to-br from-[#0f766e] to-[#134e4a] p-8 text-white shadow-[0_30px_80px_rgba(15,118,110,0.25)]">
              <div className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-100">Trust points</div>
              <h2 className="mt-3 text-4xl font-bold tracking-[-0.04em]">Designed for kinder schools that want polish without complexity.</h2>
              <div className="mt-6 space-y-4">
                {trustPoints.map((point) => (
                  <div key={point} className="flex items-start gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                    <FaCheckCircle className="mt-1 text-emerald-200" />
                    <span className="text-sm leading-7 text-emerald-50">{point}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-xl shadow-slate-200/60 backdrop-blur-sm">
              <div className="text-sm font-semibold uppercase tracking-[0.28em] text-[#c2410c]">Start now</div>
              <h2 className="mt-3 text-4xl font-bold tracking-[-0.04em] text-slate-950">Bring your school operations into one elegant workflow.</h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Create your school account, onboard staff, and let parents experience a more transparent, better-organized day from the first login.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-4 text-base font-semibold text-white transition hover:bg-slate-800">
                  Request School Registration <FaArrowRight className="text-sm" />
                </Link>
                <Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 px-6 py-4 text-base font-semibold text-slate-800 transition hover:bg-slate-50">
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/60 bg-white/70 px-4 py-8 backdrop-blur-xl sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl rounded-3xl border border-white/80 bg-gradient-to-r from-white/90 via-[#f0f9ff]/80 to-[#fff7ed]/80 px-6 py-6 shadow-xl shadow-slate-200/60">
          <div className="grid gap-6 md:grid-cols-[1.5fr_0.5fr] md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Kinder Connect</p>
            <p className="mt-2 max-w-xl text-sm leading-7 text-slate-600">
              A unified platform for school admins, teachers, and parents to run kinder operations with confidence and clarity.
            </p>
            <p className="mt-4 text-sm text-slate-500">© 2026 Kinder Connect. All rights reserved.</p>
          </div>

          <div className="flex items-center gap-3 text-sm md:justify-end">
            <Link to="/privacy" className="font-semibold text-slate-600 transition hover:text-[#0f766e]">
              Privacy Policy
            </Link>
            <span className="text-slate-300">•</span>
            <Link to="/terms" className="font-semibold text-slate-600 transition hover:text-[#c2410c]">
              Terms and Conditions
            </Link>
          </div>
          </div>
        </div>
      </footer>
    </div>
  );
}