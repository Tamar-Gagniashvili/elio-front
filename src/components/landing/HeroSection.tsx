import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';
import appScreenshot from '@/assets/landing/app-screenshot.png';

export default function HeroSection() {
  const scrollToContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background pt-16 pb-8 md:pt-24 md:pb-12">
      {/* Subtle background glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="container max-w-screen-xl relative z-10">
        {/* Centered text content */}
        <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            <span>All-in-one sales inbox</span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl leading-[1.1]">
            Unify Your
            <span className="block text-primary">Sales Conversations</span>
          </h1>
          
          <p className="mt-6 text-lg md:text-xl leading-8 text-muted-foreground max-w-2xl mx-auto">
            Manage WhatsApp, Telegram, Instagram and more in one powerful inbox. 
            Close deals faster with complete context at your fingertips.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild className="w-full sm:w-auto h-14 px-8 text-lg gradient-primary hover:opacity-90 transition-opacity shadow-lg shadow-primary/25">
              <Link to="/auth" className="flex items-center gap-2">
                Get Started Free
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={scrollToContact}
              className="w-full sm:w-auto h-14 px-8 text-lg border-2"
            >
              Contact Us
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success" />
              <span>5-minute setup</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success" />
              <span>Free forever plan</span>
            </div>
          </div>
        </div>

        {/* App screenshot below */}
        <div className="relative max-w-6xl mx-auto">
          {/* Glow behind image */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-2xl blur-3xl scale-95 opacity-60" />
          
          {/* Screenshot container */}
          <div className="relative rounded-xl md:rounded-2xl overflow-hidden shadow-2xl shadow-primary/10 border border-border/50">
            <img 
              src={appScreenshot} 
              alt="ReLink Inbox Interface" 
              className="w-full h-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
