import React from 'react';
import { HashIcon, UsersIcon, ServerIcon } from 'lucide-react';
import { useI18n } from '../lib/i18n';
interface WumpusEmptyStateProps {
  type:
  'no-friends' |
  'no-online' |
  'no-pending' |
  'no-blocked' |
  'no-channel' |
  'no-servers';
}
export function WumpusEmptyState({ type }: WumpusEmptyStateProps) {
  const { t } = useI18n();
  const content: Record<
    string,
    {
      titleKey: string;
      subtitleKey: string;
      icon: React.ElementType;
    }> =
  {
    'no-friends': {
      titleKey: 'wumpus.noFriends.title',
      subtitleKey: 'wumpus.noFriends.subtitle',
      icon: UsersIcon
    },
    'no-online': {
      titleKey: 'wumpus.noOnline.title',
      subtitleKey: 'wumpus.noOnline.subtitle',
      icon: UsersIcon
    },
    'no-pending': {
      titleKey: 'wumpus.noPending.title',
      subtitleKey: 'wumpus.noPending.subtitle',
      icon: UsersIcon
    },
    'no-blocked': {
      titleKey: 'wumpus.noBlocked.title',
      subtitleKey: 'wumpus.noBlocked.subtitle',
      icon: UsersIcon
    },
    'no-channel': {
      titleKey: 'wumpus.noChannel.title',
      subtitleKey: 'wumpus.noChannel.subtitle',
      icon: HashIcon
    },
    'no-servers': {
      titleKey: 'wumpus.noServers.title',
      subtitleKey: 'wumpus.noServers.subtitle',
      icon: ServerIcon
    }
  };
  const { titleKey, subtitleKey, icon: Icon } = content[type];
  return (
    <div className="flex flex-col items-center justify-center text-center px-8 py-16">
      <div className="w-48 h-48 mb-8 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 bg-[#cba6f7]/20 rounded-full flex items-center justify-center">
            <Icon className="w-16 h-16 text-[#cba6f7]" />
          </div>
        </div>
        <svg viewBox="0 0 200 200" className="w-full h-full opacity-50">
          <ellipse
            cx="100"
            cy="130"
            rx="60"
            ry="50"
            fill="#cba6f7"
            opacity="0.3" />
          
          <circle cx="80" cy="100" r="12" fill="#11111b" />
          <circle cx="120" cy="100" r="12" fill="#11111b" />
          <circle cx="84" cy="96" r="4" fill="white" />
          <circle cx="124" cy="96" r="4" fill="white" />
        </svg>
      </div>
      <h3 className="text-[#a6adc8] font-medium mb-2">{t(titleKey)}</h3>
      <p className="text-[#6c7086] text-sm max-w-md">{t(subtitleKey)}</p>
    </div>);

}