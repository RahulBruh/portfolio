import Hero from "@/components/hero/Hero";
import Experience from "@/components/experience/Experience";
import ProjectsSection from "@/components/projects/ProjectsSection";
import About from "@/components/about/About";
import TestimonialsSection from "@/components/testimonials/TestimonialsSection";
import Contact from "@/components/contact/Contact";

export default function Home() {
  return (
    <div>
      <Hero />
      <Experience />
      <ProjectsSection />
      <About />
      <TestimonialsSection />
      <Contact />
    </div>
  );
}
