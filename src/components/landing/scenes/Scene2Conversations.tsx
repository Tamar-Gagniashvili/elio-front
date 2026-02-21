import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { MessageCircle, Send, Instagram, Facebook, Package, User, Star } from 'lucide-react';

const chatMessages = [
  { sender: 'contact', text: 'Hi, I saw your listing for the 3BR apartment', time: '2:14 PM' },
  { sender: 'contact', text: 'Is it still available?', time: '2:14 PM' },
  { sender: 'agent', text: 'Yes! Let me pull up the details for you', time: '2:15 PM' },
];

const objectCards = [
  { title: '3BR Apartment — Vake', price: '$185,000', status: 'Available', color: 'hsl(142 76% 36%)' },
  { title: '2BR Studio — Saburtalo', price: '$95,000', status: 'Reserved', color: 'hsl(38 92% 50%)' },
  { title: 'Office Space — Old Tbilisi', price: '$320,000', status: 'Available', color: 'hsl(142 76% 36%)' },
];

export default function Scene2Conversations() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const sectionOpacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 1, 1, 0]);
  const chatX = useTransform(scrollYProgress, [0.1, 0.4], [0, -40]);
  const chatRotateY = useTransform(scrollYProgress, [0.1, 0.4], [0, -3]);
  const objectsOpacity = useTransform(scrollYProgress, [0.2, 0.4], [0, 1]);
  const objectsX = useTransform(scrollYProgress, [0.2, 0.4], [80, 0]);
  const titleOpacity = useTransform(scrollYProgress, [0.05, 0.2], [0, 1]);
  const titleY = useTransform(scrollYProgress, [0.05, 0.2], [40, 0]);
  const aiOpacity = useTransform(scrollYProgress, [0.45, 0.6], [0, 1]);
  const aiY = useTransform(scrollYProgress, [0.45, 0.6], [20, 0]);

  return (
    <section ref={ref} className="relative h-[200vh]" style={{ perspective: '1200px' }}>
      <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden py-16 bg-background z-10">
        <motion.div className="container max-w-screen-xl relative" style={{ opacity: sectionOpacity }}>
          {/* Section title */}
          <motion.div className="text-center mb-12" style={{ opacity: titleOpacity, y: titleY }}>
            <span className="text-sm font-semibold tracking-widest uppercase" style={{ color: 'hsl(173 80% 40%)' }}>
              Unified Inbox
            </span>
            <h2 className="mt-2 text-3xl md:text-5xl font-bold text-foreground">
              Conversations Become <span className="text-primary">Data</span>
            </h2>
            <p className="mt-3 text-muted-foreground text-lg max-w-lg mx-auto">
              Every message feeds into a structured system. Context is never lost.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8 items-start max-w-5xl mx-auto">
            {/* Chat window */}
            <motion.div
              className="rounded-2xl border border-border/50 bg-card shadow-xl overflow-hidden"
              style={{
                x: chatX,
                rotateY: chatRotateY,
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Chat header */}
              <div className="flex items-center gap-3 p-4 border-b border-border/50 bg-muted/30">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Giorgi Beridze</p>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-channel-whatsapp" />
                    <span className="text-xs text-muted-foreground">WhatsApp</span>
                  </div>
                </div>
                <div className="ml-auto flex gap-1">
                  {[MessageCircle, Send, Instagram, Facebook].map((Icon, i) => (
                    <div key={i} className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                      <Icon className="h-3 w-3 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </div>
              {/* Messages */}
              <div className="p-4 space-y-3 min-h-[220px]">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.sender === 'agent' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                        msg.sender === 'agent'
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted text-foreground rounded-bl-md'
                      }`}
                    >
                      <p>{msg.text}</p>
                      <p className={`text-[10px] mt-1 ${msg.sender === 'agent' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                        {msg.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Object cards (emerging from depth) */}
            <motion.div
              className="space-y-3"
              style={{ opacity: objectsOpacity, x: objectsX }}
            >
              {objectCards.map((obj, i) => (
                <motion.div
                  key={obj.title}
                  className="rounded-xl border border-border/50 bg-card p-4 shadow-lg"
                  style={{
                    y: useTransform(scrollYProgress, [0.25 + i * 0.05, 0.45 + i * 0.05], [30, 0]),
                    opacity: useTransform(scrollYProgress, [0.25 + i * 0.05, 0.4 + i * 0.05], [0, 1]),
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{obj.title}</p>
                        <p className="text-muted-foreground text-xs">{obj.price}</p>
                      </div>
                    </div>
                    <span
                      className="text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ background: `${obj.color}20`, color: obj.color }}
                    >
                      {obj.status}
                    </span>
                  </div>
                </motion.div>
              ))}

              {/* AI suggestion overlay */}
              <motion.div
                className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-4 mt-2"
                style={{ opacity: aiOpacity, y: aiY }}
              >
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Star className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary">AI Suggestion</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Based on the conversation, link "3BR Apartment — Vake" to this chat. The customer expressed interest in this property.
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
