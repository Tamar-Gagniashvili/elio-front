import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, MessageCircle, Users, Bell, TrendingUp, CheckCircle, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import appScreenshot from '@/assets/landing/app-screenshot.png';
import channelsMockup from '@/assets/landing/channels-mockup.png';
import inboxMockup from '@/assets/landing/inbox-mockup.png';

// Demo screens data
const demoScreens = [
  { src: inboxMockup, alt: 'ReLink Inbox - Unified Messaging' },
  { src: appScreenshot, alt: 'ReLink Dashboard - Overview' },
  { src: channelsMockup, alt: 'ReLink Channels - Multi-platform' },
];

// Floating card component
function FloatingCard({ 
  children, 
  className = '', 
  delay = 0,
  y = 0
}: { 
  children: React.ReactNode; 
  className?: string; 
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: 1, 
        y: [y, y - 8, y],
      }}
      transition={{ 
        opacity: { duration: 0.6, delay },
        y: { 
          duration: 3.5, 
          repeat: Infinity, 
          repeatType: "reverse",
          ease: "easeInOut",
          delay 
        }
      }}
      className={`absolute bg-card/95 backdrop-blur-sm border border-border/50 rounded-xl shadow-xl z-20 ${className}`}
    >
      {children}
    </motion.div>
  );
}

export default function HeroSection() {
  const [currentScreen, setCurrentScreen] = useState(0);

  // Auto-cycle through screens
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentScreen((prev) => (prev + 1) % demoScreens.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const scrollToContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background pt-16 pb-8 md:pt-20 md:pb-16 lg:pt-24 lg:pb-20">
      {/* Subtle background glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 h-[500px] w-[600px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute top-40 right-1/4 h-[300px] w-[400px] rounded-full bg-accent/20 blur-[100px]" />
      </div>

      <div className="container max-w-screen-xl relative z-10">
        {/* Side by side layout */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          {/* Left side - Text content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6"
            >
              <Sparkles className="h-4 w-4" />
              <span>All-in-one sales inbox</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.1]"
            >
              Unify Your
              <span className="block text-primary">Sales Conversations</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 text-lg md:text-xl leading-8 text-muted-foreground max-w-xl mx-auto lg:mx-0"
            >
              Manage WhatsApp, Telegram, Instagram and more in one powerful inbox. 
              Close deals faster with complete context at your fingertips.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-10 flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4"
            >
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
            </motion.div>

            {/* Trust indicators */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-muted-foreground"
            >
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
            </motion.div>
          </div>

          {/* Right side - Desktop mockup with floating cards */}
          <div className="relative hidden lg:block">
            {/* Floating cards */}
            <FloatingCard 
              className="p-4 -left-16 top-8 w-64" 
              delay={0.5}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-channel-whatsapp/20 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-channel-whatsapp" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">New message</p>
                  <p className="text-xs text-muted-foreground">WhatsApp • Just now</p>
                </div>
              </div>
            </FloatingCard>

            <FloatingCard 
              className="p-4 -left-12 top-44 w-56" 
              delay={0.7}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">12 active chats</p>
                  <p className="text-xs text-muted-foreground">Across all channels</p>
                </div>
              </div>
            </FloatingCard>

            <FloatingCard 
              className="p-3 -left-8 bottom-32" 
              delay={0.9}
            >
              <div className="flex items-center gap-2 text-success">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Deal closed!</span>
              </div>
            </FloatingCard>

            <FloatingCard 
              className="p-4 -right-8 top-4 w-60" 
              delay={0.6}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-channel-telegram/20 flex items-center justify-center">
                  <Send className="h-5 w-5 text-channel-telegram" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Quick reply sent</p>
                  <p className="text-xs text-muted-foreground">Telegram • 2s ago</p>
                </div>
              </div>
            </FloatingCard>

            <FloatingCard 
              className="p-4 -right-4 top-40 w-52" 
              delay={0.8}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-warning/20 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Reminder set</p>
                  <p className="text-xs text-muted-foreground">Follow up tomorrow</p>
                </div>
              </div>
            </FloatingCard>

            <FloatingCard 
              className="p-4 -right-6 bottom-28 w-48" 
              delay={1}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">+24%</p>
                  <p className="text-xs text-muted-foreground">Response rate</p>
                </div>
              </div>
            </FloatingCard>

            {/* Desktop device mockup */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative"
            >
              {/* Glow behind device */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-2xl blur-3xl scale-95 opacity-60" />
              
              {/* Laptop frame */}
              <div className="relative">
                {/* Screen bezel */}
                <div className="bg-sidebar rounded-t-2xl p-2 pb-0">
                  {/* Browser chrome */}
                  <div className="flex items-center gap-2 px-4 py-2 bg-sidebar-accent rounded-t-lg">
                    <div className="flex gap-1.5">
                      <div className="h-3 w-3 rounded-full bg-destructive/60" />
                      <div className="h-3 w-3 rounded-full bg-warning/60" />
                      <div className="h-3 w-3 rounded-full bg-success/60" />
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="bg-sidebar/50 rounded-md px-3 py-1 text-xs text-sidebar-foreground/60 text-center max-w-xs mx-auto">
                        app.relink.io
                      </div>
                    </div>
                  </div>
                  
                  {/* Screenshot slideshow */}
                  <div className="overflow-hidden rounded-b-lg h-[340px] relative bg-background">
                    <AnimatePresence mode="wait">
                      <motion.img 
                        key={currentScreen}
                        src={demoScreens[currentScreen].src} 
                        alt={demoScreens[currentScreen].alt}
                        className="w-full h-full object-cover object-top absolute inset-0"
                        initial={{ opacity: 0, scale: 1.02 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.6, ease: "easeInOut" }}
                      />
                    </AnimatePresence>
                    
                    {/* Slide indicators */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                      {demoScreens.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentScreen(index)}
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            index === currentScreen 
                              ? 'w-6 bg-primary' 
                              : 'w-1.5 bg-foreground/30 hover:bg-foreground/50'
                          }`}
                          aria-label={`Go to slide ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Laptop base */}
                <div className="relative h-4 bg-gradient-to-b from-sidebar to-sidebar-accent rounded-b-xl">
                  <div className="absolute left-1/2 -translate-x-1/2 top-0 w-20 h-1 bg-sidebar-foreground/10 rounded-b-full" />
                </div>
                
                {/* Shadow/stand */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[60%] h-2 bg-foreground/5 rounded-full blur-md" />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Mobile fallback - simple screenshot below text */}
        <div className="relative max-w-2xl mx-auto mt-12 lg:hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-2xl blur-3xl scale-95 opacity-60" />
          <div className="relative rounded-xl overflow-hidden shadow-2xl shadow-primary/10 border border-border/50">
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
