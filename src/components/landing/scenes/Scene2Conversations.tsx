import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { MessageCircle, Send, Instagram, Facebook, Package, User, Star } from 'lucide-react';

const chatMessages = [
  { sender: 'contact', text: 'Hi, I saw your listing for the 3BR apartment', time: '2:14 PM' },
  { sender: 'contact', text: 'Is it still available?', time: '2:14 PM' },
  { sender: 'agent', text: 'Yes! Let me pull up the details for you', time: '2:15 PM' },
];

const objectCards = [
  { title: '3BR Apartment — Vake', price: '$185,000', status: 'Available', color: '#99FFCC' },
  { title: '2BR Studio — Saburtalo', price: '$95,000', status: 'Reserved', color: '#FFD666' },
  { title: 'Office Space — Old Tbilisi', price: '$320,000', status: 'Available', color: '#99FFCC' },
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
      <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden py-16 z-10" style={{ background: '#050510' }}>
        {/* Subtle ambient glow */}
        <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(153,255,204,0.03) 0%, transparent 60%)' }} />

        <motion.div className="container max-w-screen-xl relative" style={{ opacity: sectionOpacity }}>
          {/* Section title */}
          <motion.div className="text-center mb-12" style={{ opacity: titleOpacity, y: titleY }}>
            <span className="text-xs font-semibold tracking-[0.3em] uppercase" style={{ color: '#99FFCC' }}>
              Unified Inbox
            </span>
            <h2 className="mt-3 text-4xl md:text-6xl font-black tracking-tight" style={{ color: '#f0f0f0' }}>
              CONVERSATIONS{' '}
              <span style={{ color: '#99FFCC' }}>BECOME DATA.</span>
            </h2>
            <p className="mt-3 text-base max-w-lg mx-auto" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Every message feeds into a structured system. Context is never lost.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8 items-start max-w-5xl mx-auto">
            {/* Chat window */}
            <motion.div
              className="rounded-2xl overflow-hidden"
              style={{
                x: chatX,
                rotateY: chatRotateY,
                transformStyle: 'preserve-3d',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(12px)',
              }}
            >
              {/* Chat header */}
              <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(153,255,204,0.1)', border: '1px solid rgba(153,255,204,0.2)' }}>
                  <User className="h-5 w-5" style={{ color: '#99FFCC' }} />
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: '#e0e0e0' }}>Giorgi Beridze</p>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ background: '#25D366' }} />
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>WhatsApp</span>
                  </div>
                </div>
                <div className="ml-auto flex gap-1">
                  {[MessageCircle, Send, Instagram, Facebook].map((Icon, i) => (
                    <div key={i} className="h-6 w-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <Icon className="h-3 w-3" style={{ color: 'rgba(255,255,255,0.3)' }} />
                    </div>
                  ))}
                </div>
              </div>
              {/* Messages */}
              <div className="p-4 space-y-3 min-h-[220px]">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.sender === 'agent' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm"
                      style={{
                        background: msg.sender === 'agent' ? '#99FFCC' : 'rgba(255,255,255,0.06)',
                        color: msg.sender === 'agent' ? '#050510' : 'rgba(255,255,255,0.7)',
                        borderRadius: msg.sender === 'agent' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      }}
                    >
                      <p>{msg.text}</p>
                      <p className="text-[10px] mt-1" style={{ opacity: 0.5 }}>{msg.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Object cards */}
            <motion.div className="space-y-3" style={{ opacity: objectsOpacity, x: objectsX }}>
              {objectCards.map((obj, i) => (
                <motion.div
                  key={obj.title}
                  className="rounded-xl p-4"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(12px)',
                    y: useTransform(scrollYProgress, [0.25 + i * 0.05, 0.45 + i * 0.05], [30, 0]),
                    opacity: useTransform(scrollYProgress, [0.25 + i * 0.05, 0.4 + i * 0.05], [0, 1]),
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(153,255,204,0.08)', border: '1px solid rgba(153,255,204,0.15)' }}>
                        <Package className="h-5 w-5" style={{ color: '#99FFCC' }} />
                      </div>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: '#e0e0e0' }}>{obj.title}</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{obj.price}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider" style={{ background: `${obj.color}15`, color: obj.color }}>
                      {obj.status}
                    </span>
                  </div>
                </motion.div>
              ))}

              {/* AI suggestion */}
              <motion.div
                className="rounded-xl p-4 mt-2"
                style={{
                  background: 'linear-gradient(135deg, rgba(153,255,204,0.06), rgba(153,255,204,0.02))',
                  border: '1px dashed rgba(153,255,204,0.25)',
                  opacity: aiOpacity,
                  y: aiY,
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(153,255,204,0.12)' }}>
                    <Star className="h-4 w-4" style={{ color: '#99FFCC' }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: '#99FFCC' }}>AI Suggestion</p>
                    <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      Based on the conversation, link "3BR Apartment — Vake" to this chat.
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
