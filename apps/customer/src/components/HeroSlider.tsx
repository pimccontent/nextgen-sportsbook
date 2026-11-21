"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";

export type HeroBanner = {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  sortOrder: number;
};

const FALLBACK_SLIDES: HeroBanner[] = [
  {
    id: "fallback-kickoff",
    title: "The beautiful game",
    subtitle: "Stadium nights, packed stands, and football from everywhere.",
    imageUrl: "/banners/hero-kickoff.jpg",
    sortOrder: 0,
  },
  {
    id: "fallback-accas",
    title: "Feel the crowd",
    subtitle: "Bet with the energy of fans across the world.",
    imageUrl: "/banners/hero-accas.jpg",
    sortOrder: 1,
  },
  {
    id: "fallback-live",
    title: "Every duel counts",
    subtitle: "Follow footballers in action with live updates.",
    imageUrl: "/banners/hero-live.jpg",
    sortOrder: 2,
  },
];

export function HeroSlider() {
  const [banners, setBanners] = React.useState<HeroBanner[]>(FALLBACK_SLIDES);
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [imgFailed, setImgFailed] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    let cancelled = false;
    void api
      .banners()
      .then((d) => {
        if (cancelled) return;
        if (d.banners?.length) {
          setBanners(
            d.banners.map((b, i) => ({
              ...b,
              // Prefer clean local football photos when API image is missing/broken SVG.
              imageUrl:
                b.imageUrl && !b.imageUrl.endsWith(".svg")
                  ? b.imageUrl
                  : FALLBACK_SLIDES[i % FALLBACK_SLIDES.length].imageUrl,
            }))
          );
        } else {
          setBanners(FALLBACK_SLIDES);
        }
      })
      .catch(() => {
        if (!cancelled) setBanners(FALLBACK_SLIDES);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (banners.length < 2 || paused) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % banners.length);
    }, 5500);
    return () => window.clearInterval(id);
  }, [banners.length, paused]);

  React.useEffect(() => {
    setIndex(0);
  }, [banners]);

  if (banners.length === 0) return null;

  const current = banners[index] ?? banners[0];
  const go = (dir: -1 | 1) => {
    setIndex((i) => (i + dir + banners.length) % banners.length);
  };

  return (
    <section
      className="relative overflow-hidden border-b border-[var(--ng-border)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Promotions"
    >
      <div className="relative aspect-[16/7] min-h-[168px] w-full sm:aspect-[21/7] sm:min-h-[210px]">
        {banners.map((b, i) => {
          const showImg = Boolean(b.imageUrl) && !imgFailed[b.id];
          return (
            <div
              key={b.id}
              className={[
                "absolute inset-0 transition-opacity duration-700",
                i === index ? "opacity-100" : "pointer-events-none opacity-0",
                showImg
                  ? "bg-[#0B1220]"
                  : "bg-[radial-gradient(ellipse_at_50%_40%,rgba(245,165,36,0.25),transparent_55%),linear-gradient(135deg,#0B1220,#1A1408)]",
              ].join(" ")}
              aria-hidden={i !== index}
            >
              {showImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={b.imageUrl}
                  alt=""
                  className="h-full w-full object-cover object-center"
                  onError={() =>
                    setImgFailed((prev) => ({ ...prev, [b.id]: true }))
                  }
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/25" />
              <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center sm:px-10">
                <p className="max-w-2xl font-display text-xl font-extrabold tracking-tight text-white sm:text-3xl md:text-4xl">
                  {b.title}
                </p>
                {b.subtitle ? (
                  <p className="mt-2 max-w-xl text-sm text-white/85 sm:mt-3 sm:text-base">
                    {b.subtitle}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {banners.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => go(-1)}
            className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur sm:left-3"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => go(1)}
            className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur sm:right-3"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-1.5">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className={[
                  "h-1.5 rounded-full transition-all",
                  i === index
                    ? "w-6 bg-[var(--ng-accent)]"
                    : "w-1.5 bg-white/50 hover:bg-white/80",
                ].join(" ")}
              />
            ))}
          </div>
        </>
      ) : null}

      <span className="sr-only">
        Slide {index + 1} of {banners.length}: {current.title}
      </span>
    </section>
  );
}
