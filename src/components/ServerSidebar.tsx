import React, { useEffect, useState } from 'react';
import { Plus, Compass, Pin, ArrowUp, ArrowDown } from 'lucide-react';
import { Server } from '../App';

interface ServerSidebarProps {
  servers: Server[];
  selectedServer: Server | null;
  onSelectServer: (server: Server) => void;
  onSelectHome: () => void;
  isHomeSelected: boolean;
  onCreateServer: () => void;
  onJoinServer: (code: string) => Promise<boolean>;
}

export function ServerSidebar({
  servers,
  selectedServer,
  onSelectServer,
  onSelectHome,
  isHomeSelected,
  onCreateServer,
  onJoinServer,
}: ServerSidebarProps) {
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    serverId: string;
  } | null>(null);

  const [pinnedServerIds, setPinnedServerIds] = useState<string[]>([]);
  const [serverOrder, setServerOrder] = useState<string[]>([]);

  useEffect(() => {
    const savedPinned = localStorage.getItem('teamup_pinned_servers');
    if (savedPinned) setPinnedServerIds(JSON.parse(savedPinned));
    const savedOrder = localStorage.getItem('teamup_server_order');
    if (savedOrder) setServerOrder(JSON.parse(savedOrder));
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setJoining(true);
    setJoinError('');
    try {
      const success = await onJoinServer(inviteCode.trim());
      if (success) {
        setShowJoinModal(false);
        setInviteCode('');
        setJoinError('');
      } else {
        setJoinError('Invalid or expired invite code.');
      }
    } catch {
      setJoinError('Something went wrong. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, serverId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, serverId });
  };

  const togglePin = (serverId: string) => {
    const newPinned = pinnedServerIds.includes(serverId)
      ? pinnedServerIds.filter((id) => id !== serverId)
      : [...pinnedServerIds, serverId];
    setPinnedServerIds(newPinned);
    localStorage.setItem('teamup_pinned_servers', JSON.stringify(newPinned));
  };

  const moveServer = (serverId: string, direction: 'up' | 'down') => {
    const currentList = sortedServers.map((s) => s.id);
    const currentIndex = currentList.indexOf(serverId);
    if (currentIndex === -1) return;
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= currentList.length) return;
    const newList = [...currentList];
    const [moved] = newList.splice(currentIndex, 1);
    newList.splice(newIndex, 0, moved);
    setServerOrder(newList);
    localStorage.setItem('teamup_server_order', JSON.stringify(newList));
  };

  const sortedServers = [...servers].sort((a, b) => {
    const aPinned = pinnedServerIds.includes(a.id);
    const bPinned = pinnedServerIds.includes(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    const aIndex = serverOrder.indexOf(a.id);
    const bIndex = serverOrder.indexOf(b.id);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return 0;
  });

  return (
    <>
      <div className="w-[56px] h-full bg-[#11111b] flex flex-col items-center py-3 gap-2 overflow-y-auto overflow-x-hidden shadow-md z-20 flex-shrink-0 custom-scrollbar">
        {/* Home Button */}
        <button
          onClick={onSelectHome}
          className={`w-10 h-10 rounded-[20px] flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
            isHomeSelected
              ? 'bg-[#cba6f7] rounded-[12px]'
              : 'bg-[#1e1e2e] hover:bg-[#cba6f7] hover:rounded-[12px]'
          }`}
        >
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.73 9.27l-7-7a1 1 0 00-1.46 0l-7 7A1 1 0 005 11h1v8a1 1 0 001 1h4a1 1 0 001-1v-4h2v4a1 1 0 001 1h4a1 1 0 001-1v-8h1a1 1 0 00.73-1.73z" />
          </svg>
        </button>

        <div className="w-6 h-0.5 bg-[#1e1e2e] rounded-full my-1 flex-shrink-0" />

        {/* Server List */}
        {sortedServers.map((server) => (
          <div key={server.id} className="relative group flex-shrink-0">
            {/* Selection Indicator */}
            <div
              className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full bg-white transition-all ${
                selectedServer?.id === server.id ? 'h-6' : 'h-0 group-hover:h-3'
              }`}
            />

            {/* Pin Indicator */}
            {pinnedServerIds.includes(server.id) && (
              <div className="absolute -top-1 -right-1 z-10 bg-[#11111b] rounded-full p-0.5">
                <Pin size={10} className="text-[#cba6f7] fill-current" />
              </div>
            )}

            <button
              onClick={() => onSelectServer(server)}
              onContextMenu={(e) => handleContextMenu(e, server.id)}
              className={`w-10 h-10 rounded-[20px] flex items-center justify-center transition-all duration-200 overflow-hidden ${
                selectedServer?.id === server.id ? 'rounded-[12px]' : 'hover:rounded-[12px]'
              }`}
              title={server.name}
            >
              {server.icon ? (
                <img src={server.icon} alt={server.name} className="w-full h-full object-cover" />
              ) : (
                <div
                  className={`w-full h-full flex items-center justify-center text-white font-medium text-sm ${
                    selectedServer?.id === server.id ? 'bg-[#cba6f7]' : 'bg-[#1e1e2e]'
                  }`}
                >
                  {server.name
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)}
                </div>
              )}
            </button>
          </div>
        ))}

        {/* Add Server Button */}
        <button
          onClick={onCreateServer}
          className="w-10 h-10 rounded-[20px] bg-[#1e1e2e] flex-shrink-0 flex items-center justify-center text-[#a6e3a1] hover:bg-[#a6e3a1] hover:text-white hover:rounded-[12px] transition-all duration-200"
          title="Add a Server"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Join Server Button */}
        <button
          onClick={() => setShowJoinModal(true)}
          className="w-10 h-10 rounded-[20px] bg-[#1e1e2e] flex-shrink-0 flex items-center justify-center text-[#bac2de] hover:bg-[#a6e3a1] hover:text-white hover:rounded-[12px] transition-all duration-200"
          title="Join a Server"
        >
          <Compass className="w-5 h-5" />
        </button>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-[#11111b] rounded-md shadow-xl py-1 w-48 border border-[#181825]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { togglePin(contextMenu.serverId); setContextMenu(null); }}
            className="w-full px-3 py-2 text-left text-sm text-[#cdd6f4] hover:bg-[#cba6f7] hover:text-white flex items-center gap-2"
          >
            <Pin size={14} />
            {pinnedServerIds.includes(contextMenu.serverId) ? 'Unpin Server' : 'Pin Server'}
          </button>
          <div className="h-[1px] bg-[#181825] my-1" />
          <button
            onClick={() => { moveServer(contextMenu.serverId, 'up'); setContextMenu(null); }}
            className="w-full px-3 py-2 text-left text-sm text-[#cdd6f4] hover:bg-[#cba6f7] hover:text-white flex items-center gap-2"
          >
            <ArrowUp size={14} />
            Move Up
          </button>
          <button
            onClick={() => { moveServer(contextMenu.serverId, 'down'); setContextMenu(null); }}
            className="w-full px-3 py-2 text-left text-sm text-[#cdd6f4] hover:bg-[#cba6f7] hover:text-white flex items-center gap-2"
          >
            <ArrowDown size={14} />
            Move Down
          </button>
        </div>
      )}

      {/* Join Server Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e1e2e] rounded-lg w-full max-w-[440px] overflow-hidden shadow-2xl">
            <div className="p-6 text-center">
              <h2 className="text-2xl font-bold text-[#cdd6f4] mb-2">Join a Server</h2>
              <p className="text-[#bac2de] text-sm mb-6">
                Enter an invite below to join an existing server.
              </p>
              <form onSubmit={handleJoin}>
                <div className="text-left mb-6">
                  <label className="block text-xs font-bold text-[#bac2de] uppercase mb-2">
                    Invite Code
                  </label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="hTKzmak"
                    className="w-full bg-[#11111b] p-2.5 rounded border-none focus:ring-0 text-[#cdd6f4] placeholder-[#6c7086]"
                    autoFocus
                  />
                  {joinError && <p className="text-[#f38ba8] text-xs mt-2">{joinError}</p>}
                </div>
              </form>
            </div>
            <div className="bg-[#181825] p-4 flex justify-between items-center">
              <button
                onClick={() => { setShowJoinModal(false); setJoinError(''); }}
                className="text-white text-sm font-medium hover:underline px-4 py-2"
              >
                Back
              </button>
              <button
                onClick={handleJoin}
                disabled={!inviteCode.trim() || joining}
                className="bg-[#cba6f7] hover:bg-[#b4befe] text-white px-6 py-2.5 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {joining ? 'Joining...' : 'Join Server'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
