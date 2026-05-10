import { MessageSquare, Package, Users, StickyNote, Check } from 'lucide-react';
import channelsMockup from '@/assets/landing/channels-mockup.png';

const features = [
  {
    icon: MessageSquare,
    title: 'Multi-Channel Inbox',
    description: 'All your messaging channels unified. WhatsApp, Telegram, Instagram, Messenger — one powerful inbox.',
    highlights: ['Unified conversation view', 'Channel-specific features', 'Real-time sync'],
    color: 'text-channel-whatsapp',
    bgColor: 'bg-channel-whatsapp/10',
  },
  {
    icon: Package,
    title: 'Business Objects',
    description: 'Link products, properties, or inventory directly to conversations for instant sales context.',
    highlights: ['Custom object types', 'Quick linking', 'Status tracking'],
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Smart routing rules, team assignments, and seamless handoffs to close deals faster.',
    highlights: ['Auto-assignment rules', 'Team mentions', 'Conversation handoff'],
    color: 'text-channel-messenger',
    bgColor: 'bg-channel-messenger/10',
  },
  {
    icon: StickyNote,
    title: 'Notes & Reminders',
    description: 'Never forget a follow-up. Personal notes and reminders for every conversation.',
    highlights: ['Color-coded notes', 'Set reminders', 'Pin important info'],
    color: 'text-warning',
    bgColor: 'bg-warning/10',
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-20 md:py-28 bg-muted/30 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      <div className="container max-w-screen-xl">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <span className="text-primary font-semibold tracking-wide uppercase text-sm">
            Powerful Features
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Everything You Need to Sell
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            A complete toolkit for managing customer conversations and closing deals.
          </p>
        </div>
        
        {/* Features grid */}
        <div className="grid gap-6 md:grid-cols-2 mb-16">
          {features.map((feature) => (
            <div 
              key={feature.title} 
              className="group relative bg-card rounded-2xl p-8 border border-border/50 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
            >
              {/* Hover glow */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative">
                <div className={`inline-flex h-14 w-14 items-center justify-center rounded-xl ${feature.bgColor} mb-5`}>
                  <feature.icon className={`h-7 w-7 ${feature.color}`} />
                </div>
                
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                
                <p className="text-muted-foreground mb-5 leading-relaxed">
                  {feature.description}
                </p>

                {/* Feature highlights */}
                <ul className="space-y-2">
                  {feature.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-center gap-2 text-sm text-foreground/80">
                      <Check className="h-4 w-4 text-success flex-shrink-0" />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Large mockup */}
        <div className="relative">
          {/* Glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-3xl blur-3xl scale-95 opacity-50" />
          
          <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-border/50 bg-card">
            <img 
              src={channelsMockup} 
              alt="ReLink Multi-Channel Dashboard" 
              className="w-full h-auto"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
