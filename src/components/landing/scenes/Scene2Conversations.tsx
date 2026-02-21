import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { MessageCircle, Send, Instagram, Facebook, Package, User, Star } from 'lucide-react';
import cosmonautConnect from '@/assets/landing/cosmonaut-connect.png';

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
  const bgImgOpacity = useTransform(scrollYProgress, [0.1, 0.3], [0, 0.12]);

  return (
    <section ref={ref} className="relative h-[200vh]" style={{ perspective: '1200px' }}>
      <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden py-16 z-10" style={{ background: '#0a0a0a' }}>
        {/* Background cosmonaut */}
        <motion.img
          src={cosmonautConnect}
          alt=""
          className="absolute right-0 bottom-0 w-[500px] h-[500px] object-contain pointer-events-none"
          style={{ opacity: bgImgOpacity }}
        />

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

          <div className="grid lg:grid-cols-2 gap-8 items-start max-w-5xl mx-auto">
            {/* Chat window */}
            <motion.div
              className="rounded-2xl overflow-hidden"
              style={{
                x: chatX,
                rotateY: chatRotateY,
                transformStyle: 'preserve-3d',
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

            {/* Object cards */}
            <motion.div className="space-y-3" style={{ opacity: objectsOpacity, x: objectsX }}>
              {objectCards.map((obj, i) => (
                <motion.div
                  key={obj.title}
                  className="rounded-xl p-4"
                  style={{
                    background: '#141414',
                    border: '1px solid #222',
                    y: useTransform(scrollYProgress, [0.25 + i * 0.05, 0.45 + i * 0.05], [30, 0]),
                    opacity: useTransform(scrollYProgress, [0.25 + i * 0.05, 0.4 + i * 0.05], [0, 1]),
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: '#1a1a1a', border: '1px solid #333' }}>
                        <Package className="h-5 w-5" style={{ color: '#99FFCC' }} />
                      </div>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: '#e0e0e0' }}>{obj.title}</p>
                        <p className="text-xs" style={{ color: '#666' }}>{obj.price}</p>
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
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
