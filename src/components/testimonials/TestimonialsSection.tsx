import { TESTIMONIALS } from "@/data/testimonials";
import TestimonialCard from "./TestimonialCard";

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-28 px-6 max-w-[1152px] mx-auto">
      <p className="text-xs text-accent tracking-[0.25em] uppercase mb-4 font-code">
        References &amp; Mentors
      </p>
      <h2 className="font-display text-5xl font-bold leading-[1.1] mb-16 text-text">
        In their
        <br />
        own words
      </h2>
      <div className="grid gap-px bg-border" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        {TESTIMONIALS.map((t) => (
          <TestimonialCard key={t.name} testimonial={t} />
        ))}
      </div>
    </section>
  );
}
