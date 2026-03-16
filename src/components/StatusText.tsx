import React from 'react';
import { lookupCustomEmoji, lookupCustomEmojiName } from './EmojiPicker';
const CUSTOM_EMOJI_RE = /:custom:([^:]+):([^:]+):/g;
interface StatusTextProps {
  text: string;
  className?: string;
}
export function StatusText({ text, className }: StatusTextProps) {
  if (!text) return null;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  CUSTOM_EMOJI_RE.lastIndex = 0;
  while ((match = CUSTOM_EMOJI_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const packId = match[1];
    const emojiId = match[2];
    const url = lookupCustomEmoji(packId, emojiId);
    const name = lookupCustomEmojiName(packId, emojiId);
    if (url) {
      parts.push(
        <img
          key={`emoji-${match.index}`}
          src={url}
          alt={name ? `:${name}:` : ':custom emoji:'}
          title={name ? `:${name}:` : undefined}
          className="inline-block w-4 h-4 object-contain align-middle mx-0.5" />

      );
    } else {
      parts.push(match[0]);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  if (parts.length === 0) return <span className={className}>{text}</span>;
  if (parts.length === 1 && typeof parts[0] === 'string') {
    return <span className={className}>{parts[0]}</span>;
  }
  return <span className={className}>{parts}</span>;
}