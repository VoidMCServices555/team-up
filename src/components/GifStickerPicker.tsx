import React, { useEffect, useState, useRef } from 'react';
import {
  SearchIcon, XIcon, StickerIcon, ImageIcon, PlusIcon, Trash2Icon,
  PencilIcon, Link2Icon, ChevronLeftIcon, CheckIcon, DownloadIcon,
  PackageIcon, SendIcon, Loader2Icon, BookmarkIcon, Trash2,
} from 'lucide-react'
import { db } from '../lib/database';
import { processImageFile } from '../lib/cloudinary';

export interface CustomSticker { id: string; url: string; name: string }
export interface StickerPack { id: string; name: string; stickers: CustomSticker[] }
interface GifResult { id: string; url: string; preview: string; title: string }
interface GifStickerPickerProps {
  currentUserId: string
  onSelectGif: (url: string) => void
  onSelectSticker: (url: string, pack?: StickerPack) => void
  onSendPack?: (pack: StickerPack) => void
  onClose: () => void
}

// ✅ استخدم env variable لو موجود، وإلا الـ key الافتراضي
// Giphy API - مجاني ومتاح في كل مكان
const GIPHY_KEY = import.meta.env.VITE_GIPHY_API_KEY || 'GlVGYHkr3WSBnllca54iNt0yFbjz7L65'
function packsKey(userId: string) { return `teamup_sticker_packs_${userId}` }

export function loadPacks(userId: string): StickerPack[] {
  try { const raw = localStorage.getItem(packsKey(userId)); return raw ? JSON.parse(raw) : [] } catch { return [] }
}
export function savePacks(packs: StickerPack[], userId: string) {
  try { localStorage.setItem(packsKey(userId), JSON.stringify(packs)) } catch {}
}

const DATA_URL_RE = /^data:([^;]+);base64,/
function compressPack(pack: StickerPack): string {
  const compressed = { ...pack, stickers: pack.stickers.map((s) => { const m = s.url.match(DATA_URL_RE); if (m) { const raw = s.url.slice(m[0].length).replace(/=+$/, ''); return { ...s, url: `~${m[1]}~${raw}` } } return s }) }
  return btoa(unescape(encodeURIComponent(JSON.stringify(compressed))))
}
function decompressPack(code: string): StickerPack | null {
  try {
    const obj = JSON.parse(decodeURIComponent(escape(atob(code))))
    obj.stickers = (obj.stickers || []).map((s: CustomSticker) => {
      if (typeof s.url === 'string' && s.url.startsWith('~')) {
        const end = s.url.indexOf('~', 1)
        if (end !== -1) { const mime = s.url.slice(1, end); const b64 = s.url.slice(end + 1); const padded = b64 + '=='.slice(0, (4 - b64.length % 4) % 4); return { ...s, url: `data:${mime};base64,${padded}` } }
      }
      return s
    })
    return obj as StickerPack
  } catch { return null }
}
export function encodePack(pack: StickerPack): string { return compressPack(pack) }
export function decodePack(code: string): StickerPack | null { return decompressPack(code) }

function PackCard({ pack, onOpen, onRename, onShare, onSendPack, onDelete }: { pack: StickerPack; onOpen: () => void; onRename: () => void; onShare: () => void; onSendPack: () => void; onDelete: () => void }) {
  const preview = pack.stickers.slice(0, 4)
  const empty = Array(4 - preview.length).fill(null)
  return (
    <div className="group relative bg-[#1e1e2e] hover:bg-[#313244] rounded-xl border border-[#313244] hover:border-[#45475a] transition-all cursor-pointer overflow-hidden" onClick={onOpen}>
      <div className="grid grid-cols-2 gap-0.5 p-2 aspect-square">
        {preview.map((s) => <div key={s.id} className="bg-[#11111b] rounded-md overflow-hidden flex items-center justify-center"><img src={s.url} alt={s.name} className="w-full h-full object-contain p-0.5" /></div>)}
        {empty.map((_, i) => <div key={`empty-${i}`} className="bg-[#11111b] rounded-md opacity-30" />)}
      </div>
      <div className="px-2 pb-2 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[#cdd6f4] text-xs font-semibold truncate">{pack.name}</span>
          <span className="text-[10px] bg-[#313244] text-[#a6adc8] px-1.5 py-0.5 rounded-full flex-shrink-0">{pack.stickers.length}</span>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button onClick={onRename} className="p-1 rounded hover:bg-[#45475a] text-[#6c7086] hover:text-[#cdd6f4]" title="Rename"><PencilIcon className="w-3 h-3" /></button>
          <button onClick={onShare} className="p-1 rounded hover:bg-[#45475a] text-[#6c7086] hover:text-[#89b4fa]" title="Share"><Link2Icon className="w-3 h-3" /></button>
          <button onClick={onSendPack} className="p-1 rounded hover:bg-[#45475a] text-[#6c7086] hover:text-[#a6e3a1]" title="Send"><SendIcon className="w-3 h-3" /></button>
          <button onClick={onDelete} className="p-1 rounded hover:bg-[#45475a] text-[#6c7086] hover:text-[#f38ba8]" title="Delete"><Trash2Icon className="w-3 h-3" /></button>
        </div>
      </div>
    </div>
  )
}

function SharePackModal({ pack, onClose }: { pack: StickerPack; onClose: () => void }) {
  const code = encodePack(pack)
  const inputRef = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState(false)
  useEffect(() => { setTimeout(() => inputRef.current?.select(), 50) }, [])
  const handleCopy = () => {
    const input = inputRef.current
    if (input) { input.select(); input.setSelectionRange(0, 99999); try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {} }
  }
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-[480px] bg-[#11111b] rounded-2xl border border-[#313244] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#181825]">
          <div><h3 className="text-[#cdd6f4] font-bold text-base">Share Pack</h3><p className="text-[#6c7086] text-xs mt-0.5">Share <span className="text-[#cba6f7] font-medium">"{pack.name}"</span> · {pack.stickers.length} stickers</p></div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[#313244] flex items-center justify-center text-[#6c7086] hover:text-[#cdd6f4]"><XIcon className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <label className="text-xs font-semibold text-[#a6adc8] uppercase tracking-wide">Pack Code</label>
          <div className="flex items-center gap-2">
            <input ref={inputRef} readOnly value={code} onClick={(e) => (e.target as HTMLInputElement).select()} className="flex-1 bg-[#1e1e2e] border border-[#313244] rounded-xl px-3 py-2.5 text-[#89b4fa] font-mono text-xs focus:outline-none focus:border-[#cba6f7] min-w-0" />
            <button onClick={handleCopy} className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 ${copied ? 'bg-[#a6e3a1] text-white' : 'bg-[#cba6f7] hover:bg-[#b4befe] text-white'}`}>
              {copied ? <><CheckIcon className="w-4 h-4" />Copied!</> : <><DownloadIcon className="w-4 h-4" />Copy</>}
            </button>
          </div>
          <p className="text-[#45475a] text-xs">Send this code to a friend. They can paste it in the "Import Pack" field.</p>
        </div>
      </div>
    </div>
  )
}

export function GifStickerPicker({ currentUserId, onSelectGif, onSelectSticker, onSendPack, onClose }: GifStickerPickerProps) {
  const [activeTab, setActiveTab] = useState<'gif' | 'sticker' | 'saved'>('gif')
  const [savedGifs, setSavedGifs] = useState<string[]>([])

  // ✅ جيب الـ saved GIFs
  useEffect(() => {
    setSavedGifs(db.getSavedGifs(currentUserId))
  }, [currentUserId, activeTab])
  const [gifQuery, setGifQuery] = useState('')
  const [gifs, setGifs] = useState<GifResult[]>([])
  const [gifLoading, setGifLoading] = useState(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [packs, setPacks] = useState<StickerPack[]>(() => loadPacks(currentUserId))
  const [expandedPackId, setExpandedPackId] = useState<string | null>(null)
  const [renamingPackId, setRenamingPackId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [shareModalPack, setShareModalPack] = useState<StickerPack | null>(null)
  const [importCode, setImportCode] = useState('')
  const [importError, setImportError] = useState('')
  const [showNewPack, setShowNewPack] = useState(false)
  const [newPackName, setNewPackName] = useState('')
  const [pendingSticker, setPendingSticker] = useState<{ url: string; name: string } | null>(null)
  // ✅ Cloudinary upload state
  const [stickerUploading, setStickerUploading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  useEffect(() => { fetchGifs('') }, [])

  const fetchGifs = async (query: string) => {
    setGifLoading(true)
    try {
      // ✅ Giphy API - شغال في كل مكان
      const endpoint = query.trim()
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(query)}&limit=24&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=24&rating=g`
      const res = await fetch(endpoint)
      const data = await res.json()
      const results: GifResult[] = (data.data || []).map((item: any) => ({
        id: item.id,
        url: item.images?.original?.url || item.images?.downsized?.url || '',
        preview: item.images?.fixed_height_small?.url || item.images?.preview_gif?.url || item.images?.original?.url || '',
        title: item.title || '',
      })).filter((g: GifResult) => g.url)
      setGifs(results)
    } catch { setGifs([]) } finally { setGifLoading(false) }
  }

  const handleGifSearch = (q: string) => {
    setGifQuery(q)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => fetchGifs(q), 400)
  }

  const updatePacks = (next: StickerPack[]) => { setPacks(next); savePacks(next, currentUserId) }
  const handleCreatePack = () => { if (!newPackName.trim()) return; const pack: StickerPack = { id: Date.now().toString(), name: newPackName.trim(), stickers: [] }; updatePacks([...packs, pack]); setNewPackName(''); setShowNewPack(false); setExpandedPackId(pack.id) }
  const handleRenamePack = (packId: string) => { if (!renameValue.trim()) return; updatePacks(packs.map((p) => p.id === packId ? { ...p, name: renameValue.trim() } : p)); setRenamingPackId(null); setRenameValue('') }
  const handleDeletePack = (packId: string) => { updatePacks(packs.filter((p) => p.id !== packId)); if (expandedPackId === packId) setExpandedPackId(null) }
  const handleImportPack = () => {
    setImportError('')
    const pack = decodePack(importCode.trim())
    if (!pack || !pack.name || !Array.isArray(pack.stickers)) { setImportError('Invalid pack code.'); return }
    const imported: StickerPack = { ...pack, id: Date.now().toString(), stickers: pack.stickers.map((s) => ({ ...s, id: Date.now().toString() + Math.random() })) }
    updatePacks([...packs, imported]); setImportCode('')
  }

  // ✅ Cloudinary-powered sticker upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { alert('Sticker must be less than 10MB'); return }
    setStickerUploading(true)
    try {
      const url = await processImageFile(file)
      setPendingSticker({ url, name: file.name.replace(/\.[^.]+$/, '') })
    } catch (err) {
      console.error('Sticker upload failed:', err)
      alert('Failed to upload sticker. Please try again.')
    } finally {
      setStickerUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const expandedPack = packs.find((p) => p.id === expandedPackId)
  const totalStickers = packs.reduce((acc, p) => acc + p.stickers.length, 0)

  return (
    <div ref={ref} className="w-[380px] h-[460px] bg-[#11111b] rounded-xl shadow-2xl border border-[#313244] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* Tabs */}
      <div className="flex border-b border-[#181825] flex-shrink-0">
        <button onClick={() => setActiveTab('gif')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'gif' ? 'border-[#cba6f7] text-[#cdd6f4]' : 'border-transparent text-[#6c7086] hover:text-[#bac2de]'}`}>
          <ImageIcon className="w-4 h-4" />GIF
        </button>
        <button onClick={() => setActiveTab('sticker')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'sticker' ? 'border-[#cba6f7] text-[#cdd6f4]' : 'border-transparent text-[#6c7086] hover:text-[#bac2de]'}`}>
          <StickerIcon className="w-4 h-4" />Stickers
          {totalStickers > 0 && <span className="text-xs bg-[#313244] px-1.5 py-0.5 rounded-full">{totalStickers}</span>}
        </button>
        {/* ✅ Saved GIFs tab */}
        <button onClick={() => setActiveTab('saved')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'saved' ? 'border-[#cba6f7] text-[#cdd6f4]' : 'border-transparent text-[#6c7086] hover:text-[#bac2de]'}`}>
          <BookmarkIcon className="w-4 h-4" />Saved
          {savedGifs.length > 0 && <span className="text-xs bg-[#313244] px-1.5 py-0.5 rounded-full">{savedGifs.length}</span>}
        </button>
      </div>

      {/* ✅ Saved GIFs Tab */}
      {activeTab === 'saved' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {savedGifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-[#6c7086]">
              <BookmarkIcon className="w-8 h-8 opacity-50" />
              <p className="text-sm">No saved GIFs yet</p>
              <p className="text-xs opacity-60">Hover over a GIF and click bookmark to save it</p>
            </div>
          ) : (
            <div className="columns-2 gap-2 space-y-2">
              {savedGifs.map((url, i) => (
                <div key={i} className="relative group/savedgif break-inside-avoid rounded-lg overflow-hidden cursor-pointer"
                  onClick={() => { onSelectGif(url); }}>
                  <img src={url} alt="Saved GIF" className="w-full rounded-lg object-cover hover:brightness-90 transition-all" loading="lazy" />
                  <button onClick={(e) => { e.stopPropagation(); db.removeGif(currentUserId, url); setSavedGifs(db.getSavedGifs(currentUserId)); }}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover/savedgif:opacity-100 transition-opacity hover:bg-red-500">
                    <XIcon className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* GIF Tab */}
      {activeTab === 'gif' && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="p-2 flex-shrink-0">
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6c7086]" />
              <input type="text" value={gifQuery} onChange={(e) => handleGifSearch(e.target.value)} placeholder="Search GIFs..." className="w-full bg-[#1e1e2e] text-[#cdd6f4] rounded-lg pl-8 pr-3 py-2 text-sm placeholder-[#6c7086] focus:outline-none focus:ring-1 focus:ring-[#cba6f7]" autoFocus />
              {gifQuery && <button onClick={() => handleGifSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6c7086] hover:text-[#cdd6f4]"><XIcon className="w-3.5 h-3.5" /></button>}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2">
            {gifLoading ? (
              <div className="flex items-center justify-center h-full"><div className="flex gap-1">{[0,1,2].map((i) => <div key={i} className="w-2 h-2 bg-[#cba6f7] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}</div></div>
            ) : gifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center"><ImageIcon className="w-10 h-10 text-[#45475a] mb-2" /><p className="text-[#6c7086] text-sm">No GIFs found</p></div>
            ) : (
              <div className="columns-3 gap-1 space-y-1">
                {gifs.map((gif) => (
                  <button key={gif.id} onClick={() => onSelectGif(gif.url)} className="w-full rounded overflow-hidden hover:opacity-80 transition-opacity block" title={gif.title}>
                    <img src={gif.preview} alt={gif.title} className="w-full h-auto object-cover rounded" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-center text-[10px] text-[#45475a] pb-1 flex-shrink-0">Powered by GIPHY</p>
        </div>
      )}

      {/* Sticker Tab */}
      {activeTab === 'sticker' && (
        <div className="flex flex-col flex-1 min-h-0">
          {shareModalPack && <SharePackModal pack={shareModalPack} onClose={() => setShareModalPack(null)} />}

          {expandedPack ? (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-[#181825] flex-shrink-0">
                <button onClick={() => { setExpandedPackId(null); setPendingSticker(null) }} className="text-[#6c7086] hover:text-[#cdd6f4] p-1 rounded hover:bg-[#313244]"><ChevronLeftIcon className="w-4 h-4" /></button>
                <span className="text-[#cdd6f4] font-semibold text-sm flex-1 truncate">{expandedPack.name}</span>
                <span className="text-xs text-[#6c7086]">{expandedPack.stickers.length} stickers</span>
                {/* ✅ زرار Add مع loading */}
                <button
                  onClick={() => !stickerUploading && fileInputRef.current?.click()}
                  disabled={stickerUploading}
                  className="flex items-center gap-1 text-xs text-[#cba6f7] hover:text-[#b4befe] px-2 py-1 rounded hover:bg-[#313244] disabled:opacity-50">
                  {stickerUploading ? <><Loader2Icon className="w-3.5 h-3.5 animate-spin" />Uploading...</> : <><PlusIcon className="w-3.5 h-3.5" />Add</>}
                </button>
              </div>

              {pendingSticker && (
                <div className="mx-2 mt-2 flex-shrink-0 bg-[#1e1e2e] rounded-lg p-2 flex items-center gap-2 border border-[#313244]">
                  <img src={pendingSticker.url} alt="preview" className="w-10 h-10 object-contain rounded bg-[#11111b]" />
                  <input type="text" value={pendingSticker.name} onChange={(e) => setPendingSticker({ ...pendingSticker, name: e.target.value })} placeholder="Sticker name..." className="flex-1 bg-[#11111b] text-[#cdd6f4] rounded px-2 py-1 text-xs placeholder-[#6c7086] focus:outline-none focus:ring-1 focus:ring-[#cba6f7]" />
                  <button className="bg-[#cba6f7] hover:bg-[#b4befe] text-white px-2 py-1 rounded text-xs font-medium"
                    onClick={() => { const newS: CustomSticker = { id: Date.now().toString(), url: pendingSticker.url, name: pendingSticker.name }; updatePacks(packs.map((p) => p.id === expandedPack.id ? { ...p, stickers: [...p.stickers, newS] } : p)); setPendingSticker(null) }}>Add</button>
                  <button onClick={() => setPendingSticker(null)} className="text-[#6c7086] hover:text-[#f38ba8]"><XIcon className="w-4 h-4" /></button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {expandedPack.stickers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <StickerIcon className="w-8 h-8 text-[#45475a] mb-2" />
                    <p className="text-[#6c7086] text-xs">No stickers yet — click Add to upload</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {expandedPack.stickers.map((sticker) => (
                      <div key={sticker.id} className="relative group">
                        <button onClick={() => onSelectSticker(sticker.url, expandedPack)} className="w-full aspect-square rounded-lg bg-[#1e1e2e] hover:bg-[#313244] flex items-center justify-center p-1 transition-colors overflow-hidden" title={sticker.name}>
                          <img src={sticker.url} alt={sticker.name} className="w-full h-full object-contain" />
                        </button>
                        <button onClick={() => updatePacks(packs.map((p) => p.id === expandedPack.id ? { ...p, stickers: p.stickers.filter((s) => s.id !== sticker.id) } : p))} className="absolute -top-1 -right-1 w-5 h-5 bg-[#f38ba8] rounded-full items-center justify-center hidden group-hover:flex">
                          <Trash2Icon className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex items-center gap-2 px-2 pt-2 pb-1 flex-shrink-0">
                {showNewPack ? (
                  <div className="flex items-center gap-2 w-full">
                    <input type="text" value={newPackName} onChange={(e) => setNewPackName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleCreatePack(); if (e.key === 'Escape') setShowNewPack(false) }} placeholder="Pack name..." className="flex-1 bg-[#1e1e2e] text-[#cdd6f4] rounded-lg px-3 py-1.5 text-sm placeholder-[#6c7086] focus:outline-none focus:ring-1 focus:ring-[#cba6f7]" autoFocus />
                    <button onClick={handleCreatePack} className="bg-[#cba6f7] hover:bg-[#b4befe] text-white px-3 py-1.5 rounded-lg text-sm font-medium">Create</button>
                    <button onClick={() => setShowNewPack(false)} className="text-[#6c7086] hover:text-[#cdd6f4]"><XIcon className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <>
                    <button onClick={() => setShowNewPack(true)} className="flex items-center gap-1.5 text-xs font-semibold text-[#cba6f7] hover:text-[#b4befe] px-2 py-1.5 rounded-lg hover:bg-[#313244]"><PlusIcon className="w-3.5 h-3.5" />New Pack</button>
                    <div className="flex-1" />
                    <span className="text-xs text-[#45475a]">{packs.length} pack{packs.length !== 1 ? 's' : ''}</span>
                  </>
                )}
              </div>

              {renamingPackId && (
                <div className="mx-2 mb-1 flex-shrink-0 flex items-center gap-2 bg-[#1e1e2e] rounded-lg px-3 py-1.5 border border-[#313244]">
                  <span className="text-xs text-[#6c7086]">Rename:</span>
                  <input type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleRenamePack(renamingPackId); if (e.key === 'Escape') setRenamingPackId(null) }} className="flex-1 bg-transparent text-[#cdd6f4] text-sm focus:outline-none" autoFocus />
                  <button onClick={() => handleRenamePack(renamingPackId)} className="text-[#a6e3a1] hover:text-[#a6e3a1]/80"><CheckIcon className="w-4 h-4" /></button>
                  <button onClick={() => setRenamingPackId(null)} className="text-[#6c7086] hover:text-[#f38ba8]"><XIcon className="w-4 h-4" /></button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2">
                {packs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-4">
                    <PackageIcon className="w-10 h-10 text-[#45475a] mb-3" />
                    <p className="text-[#cdd6f4] text-sm font-medium mb-1">No sticker packs yet</p>
                    <p className="text-[#6c7086] text-xs">Create a pack to organize and share your stickers</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {packs.map((pack) => (
                      <PackCard key={pack.id} pack={pack} onOpen={() => setExpandedPackId(pack.id)}
                        onRename={() => { setRenamingPackId(pack.id); setRenameValue(pack.name) }}
                        onShare={() => setShareModalPack(pack)}
                        onSendPack={() => { onSendPack?.(pack); onClose() }}
                        onDelete={() => handleDeletePack(pack.id)} />
                    ))}
                  </div>
                )}
              </div>

              <div className="px-2 pb-2 flex-shrink-0 border-t border-[#181825] pt-2">
                <div className="flex items-center gap-1.5">
                  <input type="text" value={importCode} onChange={(e) => { setImportCode(e.target.value); setImportError('') }} onKeyDown={(e) => { if (e.key === 'Enter') handleImportPack() }} placeholder="Paste pack code to import…" className="flex-1 bg-[#1e1e2e] text-[#cdd6f4] rounded-lg px-3 py-1.5 text-xs placeholder-[#45475a] focus:outline-none focus:ring-1 focus:ring-[#cba6f7]" />
                  <button onClick={handleImportPack} disabled={!importCode.trim()} className="bg-[#313244] hover:bg-[#45475a] disabled:opacity-40 text-[#cdd6f4] px-2.5 py-1.5 rounded-lg text-xs font-medium">Import</button>
                </div>
                {importError && <p className="text-[#f38ba8] text-xs mt-1">{importError}</p>}
              </div>
            </div>
          )}
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*,image/gif,image/webp" onChange={handleFileSelect} className="hidden" />
    </div>
  )
}
