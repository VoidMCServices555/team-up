import React, { useEffect, useState, useRef, Component } from 'react';
import {
  SmileIcon,
  HeartIcon,
  TreesIcon,
  CoffeeIcon,
  PlaneIcon,
  TrophyIcon,
  LightbulbIcon,
  HashIcon,
  FlagIcon,
  SearchIcon,
  XIcon,
  PlusIcon,
  SettingsIcon,
  ChevronLeftIcon,
  Trash2Icon,
  PencilIcon,
  Link2Icon,
  CheckIcon,
  DownloadIcon,
  PackageIcon,
  ImageIcon,
  SendIcon } from
'lucide-react';
// ─── Types ────────────────────────────────────────────────────────────────────
export interface CustomEmoji {
  id: string;
  url: string;
  name: string;
}
export interface CustomEmojiPack {
  id: string;
  name: string;
  emojis: CustomEmoji[];
}
interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
  currentUserId?: string;
  onSendPack?: (pack: CustomEmojiPack) => void;
}
// ─── Storage ──────────────────────────────────────────────────────────────────
function emojiPacksKey(userId: string) {
  return `teamup_custom_emojis_${userId}`;
}
export function loadEmojiPacks(userId: string): CustomEmojiPack[] {
  try {
    const raw = localStorage.getItem(emojiPacksKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
export function saveEmojiPacks(packs: CustomEmojiPack[], userId: string) {
  try {
    localStorage.setItem(emojiPacksKey(userId), JSON.stringify(packs));
  } catch {}
}
// ─── Sharing (same pattern as GifStickerPicker) ──────────────────────────────
const DATA_URL_RE = /^data:([^;]+);base64,/;
export function encodeEmojiPack(pack: CustomEmojiPack): string {
  const compressed = {
    ...pack,
    emojis: pack.emojis.map((e) => {
      const m = e.url.match(DATA_URL_RE);
      if (m) {
        const raw = e.url.slice(m[0].length).replace(/=+$/, '');
        return {
          ...e,
          url: `~${m[1]}~${raw}`
        };
      }
      return e;
    })
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(compressed))));
}
export function decodeEmojiPack(code: string): CustomEmojiPack | null {
  try {
    const obj = JSON.parse(decodeURIComponent(escape(atob(code))));
    obj.emojis = (obj.emojis || []).map((e: CustomEmoji) => {
      if (typeof e.url === 'string' && e.url.startsWith('~')) {
        const end = e.url.indexOf('~', 1);
        if (end !== -1) {
          const mime = e.url.slice(1, end);
          const b64 = e.url.slice(end + 1);
          const padded = b64 + '=='.slice(0, (4 - b64.length % 4) % 4);
          return {
            ...e,
            url: `data:${mime};base64,${padded}`
          };
        }
      }
      return e;
    });
    return obj as CustomEmojiPack;
  } catch {
    return null;
  }
}
// ─── Lookup helper for MessageBubble ──────────────────────────────────────────
export function lookupCustomEmoji(
packId: string,
emojiId: string)
: string | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('teamup_custom_emojis_')) {
        const packs: CustomEmojiPack[] = JSON.parse(
          localStorage.getItem(key) || '[]'
        );
        for (const pack of packs) {
          if (pack.id === packId) {
            const emoji = pack.emojis.find((e) => e.id === emojiId);
            if (emoji) return emoji.url;
          }
        }
      }
    }
  } catch {}
  return null;
}
export function lookupCustomEmojiName(
packId: string,
emojiId: string)
: string | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('teamup_custom_emojis_')) {
        const packs: CustomEmojiPack[] = JSON.parse(
          localStorage.getItem(key) || '[]'
        );
        for (const pack of packs) {
          if (pack.id === packId) {
            const emoji = pack.emojis.find((e) => e.id === emojiId);
            if (emoji) return emoji.name;
          }
        }
      }
    }
  } catch {}
  return null;
}
// ─── Built-in Categories ──────────────────────────────────────────────────────
const EMOJI_CATEGORIES = [
{
  id: 'smileys',
  label: 'Smileys & Emotion',
  icon: SmileIcon,
  emojis: [
  '😀',
  '😃',
  '😄',
  '😁',
  '😆',
  '😅',
  '🤣',
  '😂',
  '🙂',
  '🙃',
  '😉',
  '😊',
  '😇',
  '🥰',
  '😍',
  '🤩',
  '😘',
  '😗',
  '😚',
  '😙',
  '🥲',
  '😋',
  '😛',
  '😜',
  '🤪',
  '😝',
  '🤑',
  '🤗',
  '🤭',
  '🫢',
  '🤫',
  '🤔',
  '🫡',
  '🤐',
  '🤨',
  '😐',
  '😑',
  '😶',
  '🫥',
  '😏',
  '😒',
  '🙄',
  '😬',
  '🤥',
  '😌',
  '😔',
  '😪',
  '🤤',
  '😴',
  '😷',
  '🤒',
  '🤕',
  '🤢',
  '🤮',
  '🥵',
  '🥶',
  '🥴',
  '😵',
  '🤯',
  '🤠',
  '🥳',
  '🥸',
  '😎',
  '🤓',
  '🧐',
  '😕',
  '🫤',
  '😟',
  '🙁',
  '☹️',
  '😮',
  '😯',
  '😲',
  '😳',
  '🥺',
  '🥹',
  '😦',
  '😧',
  '😨',
  '😰',
  '😥',
  '😢',
  '😭',
  '😱',
  '😖',
  '😣',
  '😞',
  '😓',
  '😩',
  '😫',
  '🥱',
  '😤',
  '😡',
  '😠',
  '🤬',
  '😈',
  '👿',
  '💀',
  '☠️',
  '💩',
  '🤡',
  '👹',
  '👺',
  '👻',
  '👽',
  '👾',
  '🤖',
  '😺',
  '😸',
  '😹',
  '😻',
  '😼',
  '😽',
  '🙀',
  '😿',
  '😾']

},
{
  id: 'people',
  label: 'People & Body',
  icon: HeartIcon,
  emojis: [
  '👋',
  '🤚',
  '🖐️',
  '✋',
  '🖖',
  '🫱',
  '🫲',
  '🫳',
  '🫴',
  '👌',
  '🤌',
  '🤏',
  '✌️',
  '🤞',
  '🫰',
  '🤟',
  '🤘',
  '🤙',
  '👈',
  '👉',
  '👆',
  '🖕',
  '👇',
  '☝️',
  '🫵',
  '👍',
  '👎',
  '✊',
  '👊',
  '🤛',
  '🤜',
  '👏',
  '🙌',
  '🫶',
  '👐',
  '🤲',
  '🤝',
  '🙏',
  '💪',
  '🦾',
  '❤️',
  '🧡',
  '💛',
  '💚',
  '💙',
  '💜',
  '🖤',
  '🤍',
  '🤎',
  '💔',
  '❤️‍🔥',
  '❤️‍🩹',
  '💕',
  '💞',
  '💓',
  '💗',
  '💖',
  '💘',
  '💝',
  '💟']

},
{
  id: 'animals',
  label: 'Animals & Nature',
  icon: TreesIcon,
  emojis: [
  '🐶',
  '🐱',
  '🐭',
  '🐹',
  '🐰',
  '🦊',
  '🐻',
  '🐼',
  '🐻‍❄️',
  '🐨',
  '🐯',
  '🦁',
  '🐮',
  '🐷',
  '🐸',
  '🐵',
  '🙈',
  '🙉',
  '🙊',
  '🐒',
  '🐔',
  '🐧',
  '🐦',
  '🐤',
  '🐣',
  '🐥',
  '🦆',
  '🦅',
  '🦉',
  '🦇',
  '🐺',
  '🐗',
  '🐴',
  '🦄',
  '🐝',
  '🪱',
  '🐛',
  '🦋',
  '🐌',
  '🐞',
  '🌸',
  '💮',
  '🏵️',
  '🌹',
  '🥀',
  '🌺',
  '🌻',
  '🌼',
  '🌷',
  '🌱',
  '🪴',
  '🌲',
  '🌳',
  '🌴',
  '🌵',
  '🌾',
  '🌿',
  '☘️',
  '🍀',
  '🍁']

},
{
  id: 'food',
  label: 'Food & Drink',
  icon: CoffeeIcon,
  emojis: [
  '🍇',
  '🍈',
  '🍉',
  '🍊',
  '🍋',
  '🍌',
  '🍍',
  '🥭',
  '🍎',
  '🍏',
  '🍐',
  '🍑',
  '🍒',
  '🍓',
  '🫐',
  '🥝',
  '🍅',
  '🫒',
  '🥥',
  '🥑',
  '🍆',
  '🥔',
  '🥕',
  '🌽',
  '🌶️',
  '🫑',
  '🥒',
  '🥬',
  '🥦',
  '🧄',
  '🍔',
  '🍟',
  '🍕',
  '🌭',
  '🥪',
  '🌮',
  '🌯',
  '🫔',
  '🥙',
  '🧆',
  '☕',
  '🫖',
  '🍵',
  '🍶',
  '🍾',
  '🍷',
  '🍸',
  '🍹',
  '🍺',
  '🍻',
  '🥂',
  '🥃',
  '🫗',
  '🥤',
  '🧋',
  '🧃',
  '🧉',
  '🧊']

},
{
  id: 'travel',
  label: 'Travel & Places',
  icon: PlaneIcon,
  emojis: [
  '🚗',
  '🚕',
  '🚙',
  '🚌',
  '🚎',
  '🏎️',
  '🚓',
  '🚑',
  '🚒',
  '🚐',
  '🛻',
  '🚚',
  '🚛',
  '🚜',
  '🏍️',
  '🛵',
  '🚲',
  '🛴',
  '🛹',
  '🛼',
  '✈️',
  '🛫',
  '🛬',
  '🪂',
  '💺',
  '🚀',
  '🛸',
  '🏠',
  '🏡',
  '🏢',
  '🏣',
  '🏤',
  '🏥',
  '🏦',
  '🏨',
  '🏩',
  '🏪',
  '🏫',
  '🏬',
  '🏭',
  '🌍',
  '🌎',
  '🌏',
  '🌐',
  '🗺️',
  '🧭',
  '🏔️',
  '⛰️',
  '🌋',
  '🗻',
  '🏕️',
  '🏖️',
  '🏜️',
  '🏝️',
  '🏞️']

},
{
  id: 'activities',
  label: 'Activities',
  icon: TrophyIcon,
  emojis: [
  '⚽',
  '🏀',
  '🏈',
  '⚾',
  '🥎',
  '🎾',
  '🏐',
  '🏉',
  '🥏',
  '🎱',
  '🪀',
  '🏓',
  '🏸',
  '🏒',
  '🏑',
  '🥍',
  '🏏',
  '🪃',
  '🥅',
  '⛳',
  '🪁',
  '🏹',
  '🎣',
  '🤿',
  '🥊',
  '🥋',
  '🎽',
  '🛹',
  '🛼',
  '🛷',
  '⛸️',
  '🥌',
  '🎿',
  '⛷️',
  '🏂',
  '🪂',
  '🏋️',
  '🤸',
  '⛹️',
  '🤺',
  '🎮',
  '🕹️',
  '🎲',
  '🧩',
  '♟️',
  '🎯',
  '🎳',
  '🎭',
  '🎨',
  '🎬',
  '🎤',
  '🎧',
  '🎼',
  '🎹',
  '🥁',
  '🪘',
  '🎷',
  '🎺',
  '🪗',
  '🎸',
  '🎻',
  '🎪',
  '🎠',
  '🎡',
  '🎢',
  '🏆',
  '🥇',
  '🥈',
  '🥉',
  '🏅']

},
{
  id: 'objects',
  label: 'Objects',
  icon: LightbulbIcon,
  emojis: [
  '⌚',
  '📱',
  '📲',
  '💻',
  '⌨️',
  '🖥️',
  '🖨️',
  '🖱️',
  '🖲️',
  '🕹️',
  '💾',
  '💿',
  '📀',
  '📷',
  '📸',
  '📹',
  '🎥',
  '📽️',
  '🎞️',
  '📞',
  '☎️',
  '📟',
  '📠',
  '📺',
  '📻',
  '🎙️',
  '🎚️',
  '🎛️',
  '🧭',
  '⏱️',
  '💡',
  '🔦',
  '🕯️',
  '🪔',
  '📔',
  '📕',
  '📖',
  '📗',
  '📘',
  '📙',
  '📚',
  '📓',
  '📒',
  '📃',
  '📜',
  '📄',
  '📰',
  '🗞️',
  '📑',
  '🔖',
  '💰',
  '🪙',
  '💴',
  '💵',
  '💶',
  '💷',
  '💸',
  '💳',
  '🧾',
  '💹']

},
{
  id: 'symbols',
  label: 'Symbols',
  icon: HashIcon,
  emojis: [
  '❤️',
  '🧡',
  '💛',
  '💚',
  '💙',
  '💜',
  '🖤',
  '🤍',
  '🤎',
  '💔',
  '❣️',
  '💕',
  '💞',
  '💓',
  '💗',
  '💖',
  '💘',
  '💝',
  '💟',
  '☮️',
  '✝️',
  '☪️',
  '🕉️',
  '☸️',
  '✡️',
  '🔯',
  '🕎',
  '☯️',
  '☦️',
  '🛐',
  '⛎',
  '♈',
  '♉',
  '♊',
  '♋',
  '♌',
  '♍',
  '♎',
  '♏',
  '♐',
  '♑',
  '♒',
  '♓',
  '🆔',
  '⚛️',
  '🉑',
  '☢️',
  '☣️',
  '📴',
  '📳',
  '🈶',
  '🈚',
  '🈸',
  '🈺',
  '🈷️',
  '✴️',
  '🆚',
  '💮',
  '🉐',
  '㊙️',
  '㊗️',
  '🈴',
  '🈵',
  '🈹',
  '🈲',
  '🅰️',
  '🅱️',
  '🆎',
  '🆑',
  '🅾️',
  '🆘',
  '❌',
  '⭕',
  '🛑',
  '⛔',
  '📛',
  '🚫',
  '💯',
  '💢',
  '♨️',
  '✅',
  '☑️',
  '✔️',
  '❎',
  '➕',
  '➖',
  '➗',
  '✖️',
  '💲',
  '💱']

},
{
  id: 'flags',
  label: 'Flags',
  icon: FlagIcon,
  emojis: [
  '🏁',
  '🚩',
  '🎌',
  '🏴',
  '🏳️',
  '🏳️‍🌈',
  '🏳️‍⚧️',
  '🏴‍☠️',
  '🇺🇸',
  '🇬🇧',
  '🇫🇷',
  '🇩🇪',
  '🇯🇵',
  '🇰🇷',
  '🇨🇳',
  '🇮🇳',
  '🇧🇷',
  '🇷🇺',
  '🇨🇦',
  '🇦🇺',
  '🇪🇸',
  '🇮🇹',
  '🇲🇽',
  '🇸🇦',
  '🇪🇬',
  '🇹🇷',
  '🇦🇪',
  '🇳🇱',
  '🇸🇪',
  '🇳🇴',
  '🇩🇰',
  '🇫🇮',
  '🇵🇱',
  '🇺🇦',
  '🇬🇷',
  '🇵🇹',
  '🇦🇷',
  '🇨🇴',
  '🇨🇱',
  '🇵🇪']

}];

// ─── Share Modal ──────────────────────────────────────────────────────────────
function ShareEmojiPackModal({
  pack,
  onClose



}: {pack: CustomEmojiPack;onClose: () => void;}) {
  const code = encodeEmojiPack(pack);
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    setTimeout(() => inputRef.current?.select(), 50);
  }, []);
  const handleCopy = () => {
    const input = inputRef.current;
    if (input) {
      input.select();
      input.setSelectionRange(0, 99999);
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  };
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}>
      
      <div className="w-[440px] bg-[#11111b] rounded-2xl border border-[#313244] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#181825]">
          <div>
            <h3 className="text-[#cdd6f4] font-bold text-base">
              Share Emoji Pack
            </h3>
            <p className="text-[#6c7086] text-xs mt-0.5">
              Share{' '}
              <span className="text-[#cba6f7] font-medium">"{pack.name}"</span>{' '}
              · {pack.emojis.length} emojis
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[#313244] flex items-center justify-center text-[#6c7086] hover:text-[#cdd6f4] transition-colors">
            
            <XIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <label className="text-xs font-semibold text-[#a6adc8] uppercase tracking-wide">
            Pack Code
          </label>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              readOnly
              value={code}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="flex-1 bg-[#1e1e2e] border border-[#313244] rounded-xl px-3 py-2.5 text-[#89b4fa] font-mono text-xs focus:outline-none focus:border-[#cba6f7] transition-colors min-w-0" />
            
            <button
              onClick={handleCopy}
              className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${copied ? 'bg-[#a6e3a1] text-white' : 'bg-[#cba6f7] hover:bg-[#b4befe] text-white'}`}>
              
              {copied ?
              <>
                  <CheckIcon className="w-4 h-4" /> Copied!
                </> :

              <>
                  <DownloadIcon className="w-4 h-4" /> Copy
                </>
              }
            </button>
          </div>
          <p className="text-[#45475a] text-xs">
            Send this code to a friend. They can paste it in the "Import Pack"
            field.
          </p>
        </div>
      </div>
    </div>);

}
// ─── Main Component ───────────────────────────────────────────────────────────
type ViewMode = 'browse' | 'custom-pack' | 'pack-manager';
export function EmojiPicker({
  onEmojiSelect,
  onClose,
  currentUserId,
  onSendPack
}: EmojiPickerProps) {
  // Browse state
  const [activeCategory, setActiveCategory] = useState('smileys');
  const [activeCustomPackId, setActiveCustomPackId] = useState<string | null>(
    null
  );
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('browse');
  // Custom packs state
  const [packs, setPacks] = useState<CustomEmojiPack[]>(() =>
  currentUserId ? loadEmojiPacks(currentUserId) : []
  );
  const [shareModalPack, setShareModalPack] = useState<CustomEmojiPack | null>(
    null
  );
  const [renamingPackId, setRenamingPackId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showNewPack, setShowNewPack] = useState(false);
  const [newPackName, setNewPackName] = useState('');
  const [importCode, setImportCode] = useState('');
  const [importError, setImportError] = useState('');
  const [pendingEmoji, setPendingEmoji] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);
  // ── Pack helpers ──
  const updatePacks = (next: CustomEmojiPack[]) => {
    setPacks(next);
    if (currentUserId) saveEmojiPacks(next, currentUserId);
  };
  const handleCreatePack = () => {
    if (!newPackName.trim()) return;
    const pack: CustomEmojiPack = {
      id: Date.now().toString(),
      name: newPackName.trim(),
      emojis: []
    };
    updatePacks([...packs, pack]);
    setNewPackName('');
    setShowNewPack(false);
    setActiveCustomPackId(pack.id);
    setViewMode('custom-pack');
  };
  const handleRenamePack = (packId: string) => {
    if (!renameValue.trim()) return;
    updatePacks(
      packs.map((p) =>
      p.id === packId ?
      {
        ...p,
        name: renameValue.trim()
      } :
      p
      )
    );
    setRenamingPackId(null);
    setRenameValue('');
  };
  const handleDeletePack = (packId: string) => {
    updatePacks(packs.filter((p) => p.id !== packId));
    if (activeCustomPackId === packId) {
      setActiveCustomPackId(null);
      setViewMode('browse');
    }
  };
  const handleImportPack = () => {
    setImportError('');
    const pack = decodeEmojiPack(importCode.trim());
    if (!pack || !pack.name || !Array.isArray(pack.emojis)) {
      setImportError('Invalid pack code.');
      return;
    }
    const imported: CustomEmojiPack = {
      ...pack,
      id: Date.now().toString(),
      emojis: pack.emojis.map((e) => ({
        ...e,
        id: Date.now().toString() + Math.random()
      }))
    };
    updatePacks([...packs, imported]);
    setImportCode('');
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 256 * 1024) {
      alert('Custom emoji must be less than 256KB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setPendingEmoji({
        url: reader.result as string,
        name: file.name.replace(/\.[^.]+$/, '')
      });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const handleAddEmojiToPack = (packId: string) => {
    if (!pendingEmoji) return;
    const newEmoji: CustomEmoji = {
      id: Date.now().toString(),
      url: pendingEmoji.url,
      name: pendingEmoji.name
    };
    updatePacks(
      packs.map((p) =>
      p.id === packId ?
      {
        ...p,
        emojis: [...p.emojis, newEmoji]
      } :
      p
      )
    );
    setPendingEmoji(null);
  };
  const handleDeleteEmoji = (packId: string, emojiId: string) => {
    updatePacks(
      packs.map((p) =>
      p.id === packId ?
      {
        ...p,
        emojis: p.emojis.filter((e) => e.id !== emojiId)
      } :
      p
      )
    );
  };
  // ── Derived data ──
  const filteredEmojis = search ?
  EMOJI_CATEGORIES.flatMap((cat) => cat.emojis).filter((emoji) =>
  emoji.includes(search)
  ) :
  null;
  const activeBuiltinData = EMOJI_CATEGORIES.find(
    (c) => c.id === activeCategory
  );
  const activeCustomPack = packs.find((p) => p.id === activeCustomPackId);
  const handleCategoryClick = (catId: string) => {
    setActiveCategory(catId);
    setActiveCustomPackId(null);
    setSearch('');
    setViewMode('browse');
  };
  const handleCustomPackTabClick = (packId: string) => {
    setActiveCustomPackId(packId);
    setActiveCategory('');
    setSearch('');
    setViewMode('custom-pack');
  };
  // ── Footer label ──
  const footerLabel =
  viewMode === 'pack-manager' ?
  'Pack Manager' :
  viewMode === 'custom-pack' && activeCustomPack ?
  activeCustomPack.name :
  activeBuiltinData?.label || 'Emoji Picker';
  return (
    <div
      ref={ref}
      className="w-[352px] h-[420px] bg-[#11111b] rounded-lg shadow-2xl border border-[#181825] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      
      {shareModalPack &&
      <ShareEmojiPackModal
        pack={shareModalPack}
        onClose={() => setShareModalPack(null)} />

      }

      {/* ── Search (always visible except pack-manager) ── */}
      {viewMode !== 'pack-manager' &&
      <div className="p-2 border-b border-[#181825]">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6c7086]" />
            <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
            viewMode === 'custom-pack' ?
            'Search custom emojis...' :
            'Search emojis...'
            }
            className="w-full bg-[#1e1e2e] text-[#cdd6f4] text-sm rounded-md pl-8 pr-8 py-1.5 placeholder-[#6c7086] focus:outline-none focus:ring-1 focus:ring-[#cba6f7]"
            autoFocus />
          
            {search &&
          <button
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6c7086] hover:text-[#cdd6f4]">
            
                <XIcon className="w-4 h-4" />
              </button>
          }
          </div>
        </div>
      }

      {/* ── Main Content Area ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
        {/* ═══ BROWSE VIEW ═══ */}
        {viewMode === 'browse' &&
        <div className="p-2">
            {search ?
          <>
                <p className="text-xs text-[#6c7086] px-1 mb-2">
                  Search Results
                </p>
                <div className="grid grid-cols-8 gap-0.5">
                  {(filteredEmojis || []).length === 0 ?
              <div className="col-span-8 text-center py-8 text-[#6c7086] text-sm">
                      No emojis found
                    </div> :

              (filteredEmojis || []).map((emoji, i) =>
              <button
                key={`${emoji}-${i}`}
                onClick={() => onEmojiSelect(emoji)}
                className="w-9 h-9 flex items-center justify-center text-xl rounded hover:bg-[#313244] transition-colors">
                
                        {emoji}
                      </button>
              )
              }
                </div>
                {/* Also search custom emojis */}
                {currentUserId &&
            (() => {
              const matchingCustom = packs.flatMap((p) =>
              p.emojis.
              filter((e) =>
              e.name.toLowerCase().includes(search.toLowerCase())
              ).
              map((e) => ({
                ...e,
                packId: p.id
              }))
              );
              if (matchingCustom.length === 0) return null;
              return (
                <>
                        <p className="text-xs text-[#6c7086] px-1 mb-2 mt-3">
                          Custom Emojis
                        </p>
                        <div className="grid grid-cols-8 gap-0.5">
                          {matchingCustom.map((emoji) =>
                    <button
                      key={emoji.id}
                      onClick={() =>
                      onEmojiSelect(
                        `:custom:${emoji.packId}:${emoji.id}:`
                      )
                      }
                      className="w-9 h-9 flex items-center justify-center rounded hover:bg-[#313244] transition-colors p-1"
                      title={`:${emoji.name}:`}>
                      
                              <img
                        src={emoji.url}
                        alt={emoji.name}
                        className="w-7 h-7 object-contain" />
                      
                            </button>
                    )}
                        </div>
                      </>);

            })()}
              </> :

          <>
                <p className="text-xs text-[#6c7086] font-semibold uppercase px-1 mb-2">
                  {activeBuiltinData?.label}
                </p>
                <div className="grid grid-cols-8 gap-0.5">
                  {activeBuiltinData?.emojis.map((emoji, i) =>
              <button
                key={`${emoji}-${i}`}
                onClick={() => onEmojiSelect(emoji)}
                className="w-9 h-9 flex items-center justify-center text-xl rounded hover:bg-[#313244] transition-colors">
                
                      {emoji}
                    </button>
              )}
                </div>
              </>
          }
          </div>
        }

        {/* ═══ CUSTOM PACK VIEW ═══ */}
        {viewMode === 'custom-pack' && activeCustomPack &&
        <div className="flex flex-col h-full">
            {/* Pack header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-[#181825] flex-shrink-0">
              <button
              onClick={() => {
                setViewMode('browse');
                setActiveCustomPackId(null);
                setActiveCategory('smileys');
                setPendingEmoji(null);
              }}
              className="text-[#6c7086] hover:text-[#cdd6f4] transition-colors p-1 rounded hover:bg-[#313244]">
              
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <span className="text-[#cdd6f4] font-semibold text-sm flex-1 truncate">
                {activeCustomPack.name}
              </span>
              <span className="text-xs text-[#6c7086]">
                {activeCustomPack.emojis.length} emojis
              </span>
              {onSendPack && activeCustomPack.emojis.length > 0 &&
            <button
              onClick={() => {
                onSendPack(activeCustomPack);
                onClose();
              }}
              className="flex items-center gap-1 text-xs text-[#a6e3a1] hover:text-[#a6e3a1]/80 transition-colors px-2 py-1 rounded hover:bg-[#313244]"
              title="Send pack in chat">
              
                  <SendIcon className="w-3.5 h-3.5" />
                  Send
                </button>
            }
              <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 text-xs text-[#cba6f7] hover:text-[#b4befe] transition-colors px-2 py-1 rounded hover:bg-[#313244]">
              
                <PlusIcon className="w-3.5 h-3.5" />
                Add
              </button>
            </div>

            {/* Pending emoji upload */}
            {pendingEmoji &&
          <div className="mx-2 mt-2 flex-shrink-0 bg-[#1e1e2e] rounded-lg p-2 flex items-center gap-2 border border-[#313244]">
                <img
              src={pendingEmoji.url}
              alt="preview"
              className="w-10 h-10 object-contain rounded bg-[#11111b]" />
            
                <input
              type="text"
              value={pendingEmoji.name}
              onChange={(e) =>
              setPendingEmoji({
                ...pendingEmoji,
                name: e.target.value
              })
              }
              placeholder="Emoji name..."
              className="flex-1 bg-[#11111b] text-[#cdd6f4] rounded px-2 py-1 text-xs placeholder-[#6c7086] focus:outline-none focus:ring-1 focus:ring-[#cba6f7]" />
            
                <button
              className="bg-[#cba6f7] hover:bg-[#b4befe] text-white px-2 py-1 rounded text-xs font-medium transition-colors"
              onClick={() => handleAddEmojiToPack(activeCustomPack.id)}>
              
                  Add
                </button>
                <button
              onClick={() => setPendingEmoji(null)}
              className="text-[#6c7086] hover:text-[#f38ba8]">
              
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
          }

            {/* Emoji grid (filtered by search if active) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
              {(() => {
              const emojis = search ?
              activeCustomPack.emojis.filter((e) =>
              e.name.toLowerCase().includes(search.toLowerCase())
              ) :
              activeCustomPack.emojis;
              if (emojis.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                      <ImageIcon className="w-8 h-8 text-[#45475a] mb-2" />
                      <p className="text-[#6c7086] text-xs">
                        {search ?
                      'No matching emojis' :
                      'No emojis yet — click Add to upload'}
                      </p>
                    </div>);

              }
              return (
                <div className="grid grid-cols-6 gap-1.5">
                    {emojis.map((emoji) =>
                  <div key={emoji.id} className="relative group">
                        <button
                      onClick={() =>
                      onEmojiSelect(
                        `:custom:${activeCustomPack.id}:${emoji.id}:`
                      )
                      }
                      className="w-full aspect-square rounded-lg bg-[#1e1e2e] hover:bg-[#313244] flex items-center justify-center p-1.5 transition-colors overflow-hidden"
                      title={`:${emoji.name}:`}>
                      
                          <img
                        src={emoji.url}
                        alt={emoji.name}
                        className="w-full h-full object-contain" />
                      
                        </button>
                        <button
                      onClick={() =>
                      handleDeleteEmoji(activeCustomPack.id, emoji.id)
                      }
                      className="absolute -top-1 -right-1 w-4 h-4 bg-[#f38ba8] rounded-full items-center justify-center hidden group-hover:flex">
                      
                          <Trash2Icon className="w-2.5 h-2.5 text-white" />
                        </button>
                        <p className="text-[9px] text-[#6c7086] text-center truncate mt-0.5">
                          {emoji.name}
                        </p>
                      </div>
                  )}
                  </div>);

            })()}
            </div>
          </div>
        }

        {/* ═══ PACK MANAGER VIEW ═══ */}
        {viewMode === 'pack-manager' &&
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-[#181825] flex-shrink-0">
              <button
              onClick={() => {
                setViewMode('browse');
                setActiveCategory('smileys');
              }}
              className="text-[#6c7086] hover:text-[#cdd6f4] transition-colors p-1 rounded hover:bg-[#313244]">
              
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <span className="text-[#cdd6f4] font-semibold text-sm flex-1">
                Emoji Packs
              </span>
              <span className="text-xs text-[#45475a]">
                {packs.length} pack{packs.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-2 px-2 pt-2 pb-1 flex-shrink-0">
              {showNewPack ?
            <div className="flex items-center gap-2 w-full">
                  <input
                type="text"
                value={newPackName}
                onChange={(e) => setNewPackName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreatePack();
                  if (e.key === 'Escape') setShowNewPack(false);
                }}
                placeholder="Pack name..."
                className="flex-1 bg-[#1e1e2e] text-[#cdd6f4] rounded-lg px-3 py-1.5 text-sm placeholder-[#6c7086] focus:outline-none focus:ring-1 focus:ring-[#cba6f7]"
                autoFocus />
              
                  <button
                onClick={handleCreatePack}
                className="bg-[#cba6f7] hover:bg-[#b4befe] text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                
                    Create
                  </button>
                  <button
                onClick={() => setShowNewPack(false)}
                className="text-[#6c7086] hover:text-[#cdd6f4]">
                
                    <XIcon className="w-4 h-4" />
                  </button>
                </div> :

            <button
              onClick={() => setShowNewPack(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#cba6f7] hover:text-[#b4befe] transition-colors px-2 py-1.5 rounded-lg hover:bg-[#313244]">
              
                  <PlusIcon className="w-3.5 h-3.5" />
                  New Pack
                </button>
            }
            </div>

            {/* Rename inline */}
            {renamingPackId &&
          <div className="mx-2 mb-1 flex-shrink-0 flex items-center gap-2 bg-[#1e1e2e] rounded-lg px-3 py-1.5 border border-[#313244]">
                <span className="text-xs text-[#6c7086]">Rename:</span>
                <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenamePack(renamingPackId);
                if (e.key === 'Escape') setRenamingPackId(null);
              }}
              className="flex-1 bg-transparent text-[#cdd6f4] text-sm focus:outline-none"
              autoFocus />
            
                <button
              onClick={() => handleRenamePack(renamingPackId)}
              className="text-[#a6e3a1] hover:text-[#a6e3a1]/80">
              
                  <CheckIcon className="w-4 h-4" />
                </button>
                <button
              onClick={() => setRenamingPackId(null)}
              className="text-[#6c7086] hover:text-[#f38ba8]">
              
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
          }

            {/* Pack list */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2">
              {packs.length === 0 ?
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <PackageIcon className="w-10 h-10 text-[#45475a] mb-3" />
                  <p className="text-[#cdd6f4] text-sm font-medium mb-1">
                    No emoji packs yet
                  </p>
                  <p className="text-[#6c7086] text-xs">
                    Create a pack to add your own custom emojis
                  </p>
                </div> :

            <div className="space-y-1">
                  {packs.map((pack) => {
                const preview = pack.emojis.slice(0, 4);
                return (
                  <div
                    key={pack.id}
                    className="group flex items-center gap-3 p-2 rounded-lg hover:bg-[#1e1e2e] transition-colors cursor-pointer"
                    onClick={() => {
                      setActiveCustomPackId(pack.id);
                      setViewMode('custom-pack');
                    }}>
                    
                        {/* Mini preview */}
                        <div className="w-10 h-10 rounded-lg bg-[#181825] flex-shrink-0 overflow-hidden grid grid-cols-2 gap-px p-0.5">
                          {preview.map((e) =>
                      <img
                        key={e.id}
                        src={e.url}
                        alt=""
                        className="w-full h-full object-contain" />

                      )}
                          {Array(Math.max(0, 4 - preview.length)).
                      fill(null).
                      map((_, i) =>
                      <div
                        key={`e-${i}`}
                        className="bg-[#11111b] rounded-sm opacity-30" />

                      )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[#cdd6f4] text-sm font-semibold truncate">
                            {pack.name}
                          </p>
                          <p className="text-[10px] text-[#6c7086]">
                            {pack.emojis.length} emoji
                            {pack.emojis.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        {/* Actions */}
                        <div
                      className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}>
                      
                          <button
                        onClick={() => {
                          setRenamingPackId(pack.id);
                          setRenameValue(pack.name);
                        }}
                        className="p-1 rounded hover:bg-[#45475a] text-[#6c7086] hover:text-[#cdd6f4] transition-colors"
                        title="Rename">
                        
                            <PencilIcon className="w-3 h-3" />
                          </button>
                          <button
                        onClick={() => setShareModalPack(pack)}
                        className="p-1 rounded hover:bg-[#45475a] text-[#6c7086] hover:text-[#89b4fa] transition-colors"
                        title="Share">
                        
                            <Link2Icon className="w-3 h-3" />
                          </button>
                          {onSendPack && pack.emojis.length > 0 &&
                      <button
                        onClick={() => {
                          onSendPack(pack);
                          onClose();
                        }}
                        className="p-1 rounded hover:bg-[#45475a] text-[#6c7086] hover:text-[#a6e3a1] transition-colors"
                        title="Send pack in chat">
                        
                              <SendIcon className="w-3 h-3" />
                            </button>
                      }
                          <button
                        onClick={() => handleDeletePack(pack.id)}
                        className="p-1 rounded hover:bg-[#45475a] text-[#6c7086] hover:text-[#f38ba8] transition-colors"
                        title="Delete">
                        
                            <Trash2Icon className="w-3 h-3" />
                          </button>
                        </div>
                      </div>);

              })}
                </div>
            }
            </div>

            {/* Import pack */}
            <div className="px-2 pb-2 flex-shrink-0 border-t border-[#181825] pt-2">
              <div className="flex items-center gap-1.5">
                <input
                type="text"
                value={importCode}
                onChange={(e) => {
                  setImportCode(e.target.value);
                  setImportError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleImportPack();
                }}
                placeholder="Paste pack code to import…"
                className="flex-1 bg-[#1e1e2e] text-[#cdd6f4] rounded-lg px-3 py-1.5 text-xs placeholder-[#45475a] focus:outline-none focus:ring-1 focus:ring-[#cba6f7]" />
              
                <button
                onClick={handleImportPack}
                disabled={!importCode.trim()}
                className="bg-[#313244] hover:bg-[#45475a] disabled:opacity-40 text-[#cdd6f4] px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors">
                
                  Import
                </button>
              </div>
              {importError &&
            <p className="text-[#f38ba8] text-xs mt-1">{importError}</p>
            }
            </div>
          </div>
        }
      </div>

      {/* ── Bottom Tab Bar ── */}
      <div className="flex items-center gap-0.5 px-1.5 py-1 border-t border-[#181825] bg-[#181825] overflow-x-auto flex-shrink-0">
        {/* Built-in category icons */}
        {EMOJI_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive =
          viewMode === 'browse' && activeCategory === cat.id && !search;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={`p-1.5 rounded transition-colors flex-shrink-0 ${isActive ? 'bg-[#313244] text-[#cba6f7]' : 'text-[#6c7086] hover:text-[#cdd6f4] hover:bg-[#1e1e2e]'}`}
              title={cat.label}>
              
              <Icon className="w-4 h-4" />
            </button>);

        })}

        {/* Divider */}
        {currentUserId && packs.length > 0 &&
        <div className="w-px h-5 bg-[#45475a] mx-0.5 flex-shrink-0" />
        }

        {/* Custom pack icons */}
        {currentUserId &&
        packs.map((pack) => {
          const isActive =
          viewMode === 'custom-pack' && activeCustomPackId === pack.id;
          const firstEmoji = pack.emojis[0];
          return (
            <button
              key={pack.id}
              onClick={() => handleCustomPackTabClick(pack.id)}
              className={`p-1 rounded transition-colors flex-shrink-0 ${isActive ? 'bg-[#313244] ring-1 ring-[#cba6f7]' : 'hover:bg-[#1e1e2e]'}`}
              title={pack.name}>
              
                {firstEmoji ?
              <img
                src={firstEmoji.url}
                alt={pack.name}
                className="w-4 h-4 object-contain rounded-sm" /> :


              <PackageIcon className="w-4 h-4 text-[#6c7086]" />
              }
              </button>);

        })}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Settings gear (pack manager) */}
        {currentUserId &&
        <button
          onClick={() =>
          setViewMode(
            viewMode === 'pack-manager' ? 'browse' : 'pack-manager'
          )
          }
          className={`p-1.5 rounded transition-colors flex-shrink-0 ${viewMode === 'pack-manager' ? 'bg-[#313244] text-[#cba6f7]' : 'text-[#6c7086] hover:text-[#cdd6f4] hover:bg-[#1e1e2e]'}`}
          title="Manage emoji packs">
          
            <SettingsIcon className="w-4 h-4" />
          </button>
        }
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden" />
      
    </div>);

}