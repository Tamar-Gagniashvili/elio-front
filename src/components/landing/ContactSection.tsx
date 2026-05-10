import { Mail, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function ContactSection() {
  return (
    <section id="contact" className="py-20 md:py-28 bg-gradient-to-br from-primary/5 via-background to-accent/10 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-1/4 h-64 w-64 rounded-full bg-primary/10 blur-[100px]" />
      <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-accent/20 blur-[100px]" />
      
      <div className="container max-w-screen-xl relative z-10">
        <div className="max-w-3xl mx-auto">
          <div className="bg-card rounded-3xl p-8 md:p-12 lg:p-16 border border-border/50 shadow-2xl shadow-primary/5 text-center">
            {/* Icon */}
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6">
              <Mail className="h-8 w-8 text-primary" />
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ready to Get Started?
            </h2>
            
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Join hundreds of teams already using ReLink to manage their customer conversations and close more deals.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <Button size="lg" asChild className="w-full sm:w-auto h-14 px-8 text-lg gradient-primary hover:opacity-90 transition-opacity shadow-lg shadow-primary/25">
                <Link to="/auth" className="flex items-center gap-2">
                  Login
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            </div>

            <div className="pt-8 border-t border-border">
              <p className="text-muted-foreground mb-3">
                Have questions? We'd love to hear from you.
              </p>
              <a 
                href="mailto:contact@relink.io" 
                className="inline-flex items-center gap-2 text-lg font-semibold text-primary hover:underline"
              >
                <Mail className="h-5 w-5" />
                contact@relink.io
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
