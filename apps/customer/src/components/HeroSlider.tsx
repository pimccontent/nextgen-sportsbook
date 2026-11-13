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

export function HeroSlider() {
  const [banners, setBanners] = React.useState<HeroBanner[]>([]);
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    void api
      .banners()
      .then((d) => {
        if (!cancelled) setBanners(d.banners);
      })
      .catch(() => {
        if (!cancelled) setBanners([]);
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
      <div className="relative aspect-[16/7] min-h-[160px] w-full sm:aspect-[21/7] sm:min-h-[200px]">
        {banners.map((b, i) => (
          <div
            key={b.id}
            className={[
              "absolute inset-0 transition-opacity duration-700",
              i === index ? "opacity-100" : "pointer-events-none opacity-0",
            ].join(" ")}
            aria-hidden={i !== index}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={b.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end p-4 sm:justify-center sm:p-8 md:p-10">
              <p className="max-w-xl font-display text-xl font-extrabold tracking-tight text-white sm:text-3xl md:text-4xl">
                {b.title}
              </p>
              {b.subtitle ? (
                <p className="mt-1.5 max-w-lg text-sm text-white/85 sm:text-base">
                  {b.subtitle}
                </p>
              ) : null}
            </div>
          </div>
        ))}
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
