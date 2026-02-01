import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function HeroSection() {
  const scrollToContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background py-20 md:py-32">
      <div className="container max-w-screen-xl">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Unify Your Sales Conversations
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground md:text-xl">
            Manage WhatsApp, Telegram, Instagram and more in one powerful inbox. 
            Close deals faster with context at your fingertips.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild className="w-full sm:w-auto">
              <Link to="/auth">Get Started</Link>
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={scrollToContact}
              className="w-full sm:w-auto"
            >
              Contact Us
            </Button>
          </div>
        </div>
      </div>
      
      {/* Decorative gradient blob */}
      <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
    </section>
  );
}
