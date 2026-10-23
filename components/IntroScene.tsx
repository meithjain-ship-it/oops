"use client";

import { useEffect, useLayoutEffect, useState } from "react";

// A 15-second scene at the top of the page: someone at a laptop, a wall of confusing tech, then the alert
// "Your API key has been leaked". Pure drawing and code animation: no images, no video, nothing downloaded.
// It plays once per visit. It can be skipped, it can be replayed, and it is switched off for people who prefer less motion.
// Add ?intro=0 to the address to hide the animation.

// Made-up technical noise. Nothing here is a real key, address or secret.
const NOISE = [
  "GET /static/chunks/4821.js 200",
  "POST /v1/chat/completions 200",
  "Authorization: Bearer ▒▒▒▒▒▒▒▒",
  "x-request-id: 9f3a-71c2-be04",
  "TLS_AES_256_GCM_SHA384",
  "origin: https://app.example.com",
  "webpack://./src/lib/ai.js:4",
  "0x7f3a2c91  0x00ff1b2e  0x3c",
  "content-type: application/json",
  "set-cookie: session=▒▒▒▒▒▒",
  "dns lookup api.provider.com 12ms",
  "HTTP/2 200 OK  cache-control",
  "sourcemap: app.js.map",
  "fetch(url, { headers })",
  "npm run build  ✓ compiled",
  "git push origin main",
  "env: NEXT_PUBLIC_▒▒▒▒▒▒",
  "etag: W/“1f4a-8c2”",
];

const LINE = 16;
const BLOCK = NOISE.length * LINE;

function Column({ x, shift, speed }: { x: number; shift: number; speed: string }) {
  const rows = [...NOISE.slice(shift), ...NOISE.slice(0, shift)];
  return (
    <g className="sc-col" style={{ animationDuration: speed }}>
      {[0, 1].map((rep) =>
        rows.map((t, i) => (
          <text key={`${rep}-${i}`} x={x} y={150 + rep * BLOCK + i * LINE} className="sc-noise" fillOpacity={0.35 + ((i * 7) % 5) * 0.12}>
            {t}
          </text>
        )),
      )}
    </g>
  );
}

export default function IntroScene() {
  const [mode, setMode] = useState<"play" | "skip">("play");
  const [run, setRun] = useState(0);

  // Decide before the first paint, so there is no flash: only play on the first visit, never with reduced motion.
  useLayoutEffect(() => {
    let skip = false;
    try {
      if (new URLSearchParams(window.location.search).get("intro") === "0") skip = true;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) skip = true;
      if (!skip && window.sessionStorage.getItem("oops-intro-seen")) skip = true;
    } catch {
      // storage can be blocked; then just play
    }
    if (skip) setMode("skip");
  }, []);

  // Remember that it has been played only once it has run to the end (or was skipped), so a quick reload still shows it.
  useEffect(() => {
    if (mode === "skip") return;
    const id = window.setTimeout(() => {
      try {
        window.sessionStorage.setItem("oops-intro-seen", "1");
      } catch {
        // fine
      }
    }, 15500);
    return () => window.clearTimeout(id);
  }, [mode, run]);

  return (
    <div className="scene" data-mode={mode} key={run} role="img" aria-label="Animation: a person at a laptop gets an alert that their API key has been leaked. Most people would not understand the technical screen. That is why OOPS exists.">
      <svg viewBox="0 0 1200 520" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <linearGradient id="sc-room" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0b1226" />
            <stop offset="1" stopColor="#05070d" />
          </linearGradient>
          <radialGradient id="sc-cyan" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#5ee7ff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#5ee7ff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="sc-redglow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ff4a6b" stopOpacity="0.7" />
            <stop offset="1" stopColor="#ff4a6b" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="sc-mint" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#4ff2b3" stopOpacity="0.5" />
            <stop offset="1" stopColor="#4ff2b3" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sc-rim" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#5ee7ff" stopOpacity="0" />
            <stop offset="1" stopColor="#5ee7ff" stopOpacity="0.9" />
          </linearGradient>
          <clipPath id="sc-screen">
            <rect x="580" y="138" width="440" height="252" rx="8" />
          </clipPath>
          <filter id="sc-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>

        {/* the room */}
        <rect width="1200" height="520" fill="url(#sc-room)" />
        <rect y="410" width="1200" height="110" fill="#070a14" />
        <line x1="0" y1="410" x2="1200" y2="410" stroke="rgba(255,255,255,0.07)" />

        {/* light from the screen: cyan, then red during the alert, then green when it is fixed */}
        <ellipse className="sc-glow sc-glow-cyan" cx="800" cy="270" rx="430" ry="260" fill="url(#sc-cyan)" />
        <ellipse className="sc-glow sc-glow-red" cx="800" cy="270" rx="470" ry="280" fill="url(#sc-redglow)" />
        <ellipse className="sc-glow sc-glow-mint" cx="800" cy="270" rx="430" ry="260" fill="url(#sc-mint)" />

        {/* the person, seen from the side, lit by the screen */}
        <g className="sc-person">
          <g className="sc-breathe">
            <path d="M232 444 C234 346 242 296 286 266 C320 246 356 258 364 294 C370 334 354 386 348 444 Z" fill="#0d1425" />
            <path d="M286 266 C320 246 356 258 364 294 C370 334 354 386 348 444" fill="none" stroke="url(#sc-rim)" strokeWidth="2.5" />
            <ellipse cx="305" cy="222" rx="44" ry="40" fill="#0b1120" />
            <circle cx="326" cy="216" r="34" fill="#0f172b" />
            <path d="M356 214 C364 218 364 228 356 234" fill="none" stroke="#5ee7ff" strokeOpacity="0.55" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M304 292 C380 316 450 372 548 392" fill="none" stroke="#0f172b" strokeWidth="28" strokeLinecap="round" />
            <path d="M310 281 C384 303 454 359 548 380" fill="none" stroke="#5ee7ff" strokeOpacity="0.28" strokeWidth="2" strokeLinecap="round" />
            <ellipse cx="552" cy="392" rx="22" ry="12" fill="#101a31" />
          </g>
        </g>

        {/* the laptop */}
        <rect x="560" y="120" width="480" height="290" rx="18" fill="#0a111f" stroke="#1d2a45" strokeWidth="3" />
        <rect x="580" y="138" width="440" height="252" rx="8" fill="#04070f" />
        <rect x="500" y="410" width="580" height="16" rx="8" fill="#121b2d" />
        <rect x="520" y="408" width="540" height="4" rx="2" fill="#1a2640" />

        <g clipPath="url(#sc-screen)">
          {/* the code: dim lines, and the one line with the key */}
          <g className="sc-lines" fill="#27406b">
            {[170, 194, 218, 266, 290, 314, 338, 362].map((y, i) => (
              <rect key={y} x="602" y={y} width={[210, 150, 260, 190, 120, 240, 170, 90][i]} height="8" rx="4" opacity="0.75" />
            ))}
          </g>
          <g className="sc-codeline">
            <rect x="592" y="226" width="420" height="30" rx="6" fill="#4ff2b3" fillOpacity="0.12" />
            <text x="602" y="247" className="sc-keytext">
              KEY = “sk-pro…[HIDDEN BY OOPS]”
            </text>
            <rect className="sc-cursor" x="936" y="232" width="9" height="18" fill="#4ff2b3" />
            <line className="sc-strike" x1="598" y1="241" x2="1006" y2="241" stroke="#ff5470" strokeWidth="3.5" strokeLinecap="round" />
          </g>

          {/* the wall of confusing tech */}
          <g className="sc-flood">
            <rect x="580" y="138" width="440" height="252" fill="#03060d" fillOpacity="0.96" />
            <Column x={598} shift={0} speed="0.9s" />
            <Column x={742} shift={6} speed="1.15s" />
            <Column x={886} shift={11} speed="0.8s" />
          </g>

          {/* fixed: a shield with a tick */}
          <g className="sc-shield">
            <path d="M800 168 L866 192 V250 C866 292 836 320 800 336 C764 320 734 292 734 250 V192 Z" fill="#4ff2b3" fillOpacity="0.14" stroke="#4ff2b3" strokeWidth="4" strokeLinejoin="round" />
            <path d="M770 250 L792 272 L832 226" fill="none" stroke="#4ff2b3" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>

        {/* red flash on the alert */}
        <rect className="sc-red" width="1200" height="520" fill="#ff2d55" />
      </svg>

      <p className="sc-label">What a leak looks like</p>

      <div className="sc-notif-slide">
        <div className="sc-notif-buzz">
          <div className="sc-notif">
            <span className="sc-dot" aria-hidden="true" />
            <div>
              <b>Security alert</b>
              <span>Your API key has been leaked.</span>
            </div>
            <small>now</small>
          </div>
        </div>
      </div>

      <p className="sc-caption">
        Didn’t understand any of this? That’s why <b>OOPS</b> exists.
      </p>

      <div className="sc-controls">
        {mode === "play" ? (
          <button className="ghost tiny" type="button" onClick={() => setMode("skip")}>Skip</button>
        ) : (
          <button className="ghost tiny" type="button" onClick={() => { setMode("play"); setRun((n) => n + 1); }}>Replay</button>
        )}
      </div>
    </div>
  );
}
