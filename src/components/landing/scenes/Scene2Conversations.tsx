import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { MessageCircle, Send, Instagram, Facebook, User, Star } from 'lucide-react';
import cosmonautFloating from '@/assets/landing/cosmonaut-floating.png';

const chatMessages = [
  { sender: 'contact', text: 'Hi, I saw your listing for the 3BR apartment', time: '2:14 PM' },
  { sender: 'contact', text: 'Is it still available?', time: '2:14 PM' },
  { sender: 'agent', text: 'Yes! Let me pull up the details for you', time: '2:15 PM' },
];

export default function Scene2Conversations() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const sectionOpacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 1, 1, 0]);
  const chatX = useTransform(scrollYProgress, [0.05, 0.3], [80, 0]);
  const chatOpacity = useTransform(scrollYProgress, [0.05, 0.25], [0, 1]);
  const titleOpacity = useTransform(scrollYProgress, [0.05, 0.2], [0, 1]);
  const titleY = useTransform(scrollYProgress, [0.05, 0.2], [40, 0]);
  const aiOpacity = useTransform(scrollYProgress, [0.3, 0.45], [0, 1]);
  const aiY = useTransform(scrollYProgress, [0.3, 0.45], [20, 0]);

  // Cosmonaut enters from left
  const cosmonautX = useTransform(scrollYProgress, [0.1, 0.3], [-200, 0]);
  const cosmonautOpacity = useTransform(scrollYProgress, [0.1, 0.25], [0, 1]);
  const cosmonautRotate = useTransform(scrollYProgress, [0.1, 0.35], [-15, 5]);

  return (
    <section ref={ref} className="relative h-[200vh]" style={{ perspective: '1200px' }}>
      <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden py-16 z-10" style={{ background: '#0a0a0a' }}>
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
            <p className="mt-3 text-base max-w-lg mx-auto" style={{ color: '#666' }}>
              Every message feeds into a structured system. Context is never lost.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8 items-center max-w-5xl mx-auto">
            {/* LEFT: Cosmonaut floating */}
            <motion.div
              className="flex items-center justify-center"
              style={{
                x: cosmonautX,
                opacity: cosmonautOpacity,
                rotate: cosmonautRotate,
              }}
            >
              <motion.img
                src={cosmonautFloating}
                alt="Floating cosmonaut"
                className="w-[340px] md:w-[420px] h-auto drop-shadow-[0_0_40px_rgba(153,255,204,0.25)]"
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  WebkitMaskImage: 'radial-gradient(ellipse 65% 70% at 50% 45%, black 40%, transparent 75%)',
                  maskImage: 'radial-gradient(ellipse 65% 70% at 50% 45%, black 40%, transparent 75%)',
                }}
              />
            </motion.div>

            {/* RIGHT: Chat window + AI suggestion */}
            <div className="space-y-4">
              <motion.div
                className="rounded-2xl overflow-hidden"
                style={{
                  x: chatX,
                  opacity: chatOpacity,
                  background: '#141414',
                  border: '1px solid #222',
                }}
              >
                {/* Chat header */}
                <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid #222' }}>
                  <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: '#1a1a1a', border: '1px solid #333' }}>
                    <User className="h-5 w-5" style={{ color: '#99FFCC' }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: '#e0e0e0' }}>Giorgi Beridze</p>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full" style={{ background: '#25D366' }} />
                      <span className="text-xs" style={{ color: '#666' }}>WhatsApp</span>
                    </div>
                  </div>
                  <div className="ml-auto flex gap-1">
                    {[MessageCircle, Send, Instagram, Facebook].map((Icon, i) => (
                      <div key={i} className="h-6 w-6 rounded-full flex items-center justify-center" style={{ background: '#1a1a1a' }}>
                        <Icon className="h-3 w-3" style={{ color: '#555' }} />
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
                          background: msg.sender === 'agent' ? '#99FFCC' : '#1e1e1e',
                          color: msg.sender === 'agent' ? '#0a0a0a' : '#d0d0d0',
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

              {/* AI suggestion below chat */}
              <motion.div
                className="rounded-xl p-4"
                style={{
                  background: 'linear-gradient(135deg, #99FFCC10, #99FFCC05)',
                  border: '1px dashed #99FFCC40',
                  opacity: aiOpacity,
                  y: aiY,
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#99FFCC20' }}>
                    <Star className="h-4 w-4" style={{ color: '#99FFCC' }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: '#99FFCC' }}>AI Suggestion</p>
                    <p className="text-xs mt-1" style={{ color: '#888' }}>
                      Based on the conversation, link "3BR Apartment — Vake" to this chat.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
