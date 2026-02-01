import { Mail } from 'lucide-react';

export default function ContactSection() {
  return (
    <section id="contact" className="py-20 md:py-28">
      <div className="container max-w-screen-xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Get in Touch
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Have questions? We'd love to hear from you.
          </p>
          
          <div className="mt-10 flex items-center justify-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm text-muted-foreground">Email us at</p>
              <a 
                href="mailto:contact@relink.io" 
                className="text-lg font-medium text-foreground hover:text-primary transition-colors"
              >
                contact@relink.io
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
