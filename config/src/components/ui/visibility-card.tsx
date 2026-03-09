import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface VisibilityCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  isVisible: boolean;
  onToggleVisibility: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const VisibilityCard = ({
  title,
  value,
  subtitle,
  icon,
  isVisible,
  onToggleVisibility,
  className,
  children
}: VisibilityCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  if (!isVisible) {
    return (
      <Card
        className={cn("relative border-dashed border-muted-foreground/30 min-w-0", className)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <CardContent className="flex items-center justify-center p-4 sm:p-6">
          <div className="text-center space-y-2">
            <div className="text-muted-foreground/50">
              <EyeOff className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2" />
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">Hidden</p>
            {isHovered && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleVisibility}
                className="mt-2"
              >
                <Eye className="w-3 h-3 mr-1" />
                Show
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn("relative group min-w-0", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
        <CardTitle className="text-xs sm:text-sm font-medium truncate">{title}</CardTitle>
        <div className="flex items-center gap-2 flex-shrink-0">
          {icon}
          {isHovered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleVisibility}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto"
            >
              <EyeOff className="w-3 h-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        {children || (
          <>
            <div className="text-xl sm:text-2xl font-bold truncate">{value}</div>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};