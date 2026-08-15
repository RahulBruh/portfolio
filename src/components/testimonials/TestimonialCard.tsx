import type { Testimonial } from "@/data/testimonials";

export default function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="bg-surface p-8 flex flex-col gap-6 transition-colors duration-200 hover:bg-surface-raised">
      <div className="flex items-center gap-3 pb-4 border-b border-border min-h-[72px]">
        <div className="w-10 h-10 rounded-full bg-surface-raised border border-border flex items-center justify-center flex-shrink-0 text-accent font-display text-[15px]">
          {testimonial.initials}
        </div>
        <div>
          <div className="text-sm font-medium text-text">{testimonial.name}</div>
          <div className="text-xs text-text-muted font-code">{testimonial.title}</div>
          <div className="text-xs text-[rgba(0,212,255,0.7)] font-code">{testimonial.company}</div>
        </div>
      </div>
      <blockquote className="text-quote leading-[1.8] font-light text-sm flex-1 m-0">
        &ldquo;{testimonial.quote}&rdquo;
      </blockquote>
    </div>
  );
}
