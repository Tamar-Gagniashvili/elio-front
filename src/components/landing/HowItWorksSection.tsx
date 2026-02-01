import { MessageSquarePlus, Zap, Users, TrendingUp } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: MessageSquarePlus,
    title: 'Connect Your Channels',
    description: 'Link your WhatsApp, Telegram, Instagram, and Messenger accounts in just a few clicks.',
    color: 'bg-channel-whatsapp',
  },
  {
    number: '02',
    icon: Zap,
    title: 'Set Up Smart Routing',
    description: 'Create rules to automatically assign conversations to the right team members.',
    color: 'bg-primary',
  },
  {
    number: '03',
    icon: Users,
    title: 'Collaborate as a Team',
    description: 'Work together with notes, mentions, and seamless handoffs between agents.',
    color: 'bg-channel-messenger',
  },
  {
    number: '04',
    icon: TrendingUp,
    title: 'Close More Deals',
    description: 'Use linked products and customer context to convert conversations into sales.',
    color: 'bg-success',
  },
];

export default function HowItWorksSection() {
  return (
    <section className="py-20 md:py-28 bg-background relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.05)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--accent)/0.08)_0%,transparent_50%)]" />
      
      <div className="container max-w-screen-xl relative z-10">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <span className="text-primary font-semibold tracking-wide uppercase text-sm">
            Simple Process
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Get started in minutes, not days. Here's how ReLink transforms your sales workflow.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={step.number} className="relative group">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-[60%] w-full h-0.5 bg-gradient-to-r from-border to-transparent" />
              )}
              
              <div className="relative bg-card rounded-2xl p-6 border border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 h-full">
                {/* Number badge */}
                <div className="absolute -top-3 -right-3 h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground border border-border">
                  {step.number}
                </div>

                {/* Icon */}
                <div className={`h-14 w-14 rounded-xl ${step.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <step.icon className="h-7 w-7 text-white" />
                </div>

                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
