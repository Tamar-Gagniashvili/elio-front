import LandingNav from '@/components/landing/scenes/LandingNav';
import Scene1TheLink from '@/components/landing/scenes/Scene1TheLink';
import Scene2Conversations from '@/components/landing/scenes/Scene2Conversations';
import Scene3AIMatching from '@/components/landing/scenes/Scene3AIMatching';
import Scene4Industries from '@/components/landing/scenes/Scene4Industries';
import Scene5CTA from '@/components/landing/scenes/Scene5CTA';
import FlyingCosmonaut from '@/components/landing/FlyingCosmonaut';

export default function Landing() {
  return (
    <div className="relative">
      <FlyingCosmonaut />
      <LandingNav />
      <Scene1TheLink />
      <Scene2Conversations />
      <Scene3AIMatching />
      <Scene4Industries />
      <Scene5CTA />
    </div>
  );
}
