import { useEffect, useState } from 'react';
import { Wifi, Shield, Zap, Globe, Server, Database } from 'lucide-react';

const icons = [Wifi, Shield, Zap, Globe, Server, Database];

const FloatingIcon = ({ 
  Icon, 
  delay, 
  duration,
  startX,
  startY 
}: { 
  Icon: any; 
  delay: number;
  duration: number;
  startX: number;
  startY: number;
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`absolute transition-all duration-1000 ${isVisible ? 'opacity-30' : 'opacity-0'}`}
      style={{
        left: `${startX}%`,
        top: `${startY}%`,
        animation: isVisible ? `float ${duration}s ease-in-out infinite ${delay}ms` : 'none',
      }}
    >
      <div className="p-3 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
        <Icon className="w-6 h-6 text-primary/60" />
      </div>
    </div>
  );
};

export const FloatingElements = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {icons.map((Icon, index) => (
        <FloatingIcon
          key={index}
          Icon={Icon}
          delay={index * 800}
          duration={4 + (index % 3)}
          startX={10 + (index * 15) % 80}
          startY={20 + (index * 20) % 60}
        />
      ))}
      
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            25% { transform: translateY(-10px) rotate(1deg); }
            50% { transform: translateY(-5px) rotate(-1deg); }
            75% { transform: translateY(-15px) rotate(0.5deg); }
          }
        `
      }} />
    </div>
  );
};