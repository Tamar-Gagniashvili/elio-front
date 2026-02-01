import { MessageSquare, Package, Users, StickyNote } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const features = [
  {
    icon: MessageSquare,
    title: 'Multi-Channel Inbox',
    description: 'Connect WhatsApp, Telegram, Instagram, Messenger and more. All conversations in one place.',
  },
  {
    icon: Package,
    title: 'Business Objects',
    description: 'Link your inventory, products, or properties directly to conversations for instant context.',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Smart routing rules, team assignments, and handoffs to close deals faster.',
  },
  {
    icon: StickyNote,
    title: 'Notes & Reminders',
    description: 'Never forget a follow-up. Personal notes and reminders for every conversation.',
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container max-w-screen-xl">
        <div className="mx-auto max-w-2xl text-center mb-12 md:mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything You Need to Sell
          </h2>
        </div>
        
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Card key={feature.title} className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
