import { 
  MessageCircle, 
  Send, 
  Instagram, 
  Facebook,
  Phone,
  Globe,
  Mail
} from 'lucide-react';

const channels = [
  { 
    name: 'WhatsApp', 
    icon: MessageCircle, 
    color: 'bg-channel-whatsapp',
    description: 'Business API integration'
  },
  { 
    name: 'Telegram', 
    icon: Send, 
    color: 'bg-channel-telegram',
    description: 'Bot & group support'
  },
  { 
    name: 'Instagram', 
    icon: Instagram, 
    color: 'bg-channel-instagram',
    description: 'DMs & comments'
  },
  { 
    name: 'Messenger', 
    icon: Facebook, 
    color: 'bg-channel-messenger',
    description: 'Facebook Pages'
  },
  { 
    name: 'Web Chat', 
    icon: Globe, 
    color: 'bg-primary',
    description: 'Embeddable widget'
  },
  { 
    name: 'SMS', 
    icon: Phone, 
    color: 'bg-channel-sms',
    description: 'Text messaging'
  },
  { 
    name: 'Email', 
    icon: Mail, 
    color: 'bg-channel-email',
    description: 'Coming soon'
  },
];

export default function ChannelsSection() {
  return (
    <section className="py-20 md:py-28 bg-gradient-to-b from-background to-muted/30">
      <div className="container max-w-screen-xl">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <span className="text-primary font-semibold tracking-wide uppercase text-sm">
            Integrations
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Connect All Your Channels
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            One inbox for all your customer conversations. No more switching between apps.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
          {channels.map((channel) => (
            <div 
              key={channel.name}
              className="group flex flex-col items-center p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className={`h-14 w-14 rounded-xl ${channel.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <channel.icon className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-semibold text-foreground text-sm mb-1">
                {channel.name}
              </h3>
              <p className="text-xs text-muted-foreground text-center">
                {channel.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
