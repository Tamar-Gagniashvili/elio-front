import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';
import inboxMockup from '@/assets/landing/inbox-mockup.png';

export default function HeroSection() {
  const scrollToContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-primary/5 to-accent/20 py-16 md:py-24 lg:py-32">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-primary/20 blur-[100px] animate-pulse-soft" />
        <div className="absolute bottom-20 right-10 h-96 w-96 rounded-full bg-accent/30 blur-[120px] animate-pulse-soft" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-primary/10 blur-[150px]" />
      </div>

      <div className="container max-w-screen-xl relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              <span>All-in-one sales inbox</span>
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.1]">
              Unify Your
              <span className="block text-primary">Sales Conversations</span>
            </h1>
            
            <p className="mt-6 text-lg md:text-xl leading-8 text-muted-foreground max-w-xl mx-auto lg:mx-0">
              Manage WhatsApp, Telegram, Instagram and more in one powerful inbox. 
              Close deals faster with complete context at your fingertips.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
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
            <div className="mt-12 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-muted-foreground">
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

          {/* Right - Mockup */}
          <div className="relative">
            {/* Glow behind mockup */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-accent/30 rounded-2xl blur-3xl scale-95" />
            
            {/* Mockup container */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-primary/20 border border-border/50 bg-card">
              <img 
                src={inboxMockup} 
                alt="ReLink Inbox Interface" 
                className="w-full h-auto"
              />
              
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent pointer-events-none" />
            </div>

            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 bg-card rounded-lg shadow-lg px-4 py-2 border border-border/50 animate-fade-in">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-channel-whatsapp" />
                <span className="text-sm font-medium text-foreground">WhatsApp</span>
              </div>
            </div>
            
            <div className="absolute -bottom-4 -left-4 bg-card rounded-lg shadow-lg px-4 py-2 border border-border/50 animate-fade-in">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-channel-telegram" />
                <span className="text-sm font-medium text-foreground">Telegram</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
