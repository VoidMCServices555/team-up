/**
 * WebRTC Voice Manager
 * Uses BroadcastChannel for signaling between browser tabs.
 * Supports: audio, video (camera), screen sharing, per-user muting.
 */

const VOICE_SIGNAL_CHANNEL = 'discord_clone_voice_signal';

interface SignalMessage {
  type: 'join' | 'leave' | 'offer' | 'answer' | 'ice-candidate' | 'media-update';
  fromUserId: string;
  toUserId?: string;
  serverId: string;
  channelId: string;
  payload?: any;
}

interface PeerConnection {
  userId: string;
  connection: RTCPeerConnection;
  remoteStream: MediaStream;
  audioElement: HTMLAudioElement;
  isMutedLocally: boolean;
}

export interface RemoteStream {
  userId: string;
  stream: MediaStream;
  hasVideo: boolean;
  hasScreen: boolean;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }]

};

export class VoiceManager {
  private signalChannel: BroadcastChannel;
  private peers: Map<string, PeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private cameraStream: MediaStream | null = null;
  private userId: string = '';
  private serverId: string = '';
  private channelId: string = '';
  private isConnected: boolean = false;
  private isMuted: boolean = false;
  private isDeafened: boolean = false;

  // Callbacks
  private onPeerCountChange?: (count: number) => void;
  private onRemoteStreamsChange?: (streams: RemoteStream[]) => void;
  private onScreenShareStopped?: () => void;
  private onCameraStopped?: () => void;
  private onSpeakingChange?: (isSpeaking: boolean) => void;

  private fallbackCanvas: HTMLCanvasElement | null = null;
  private fallbackAnimationId: number | null = null;

  // Audio analysis for speaking detection
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private speakingCheckInterval: ReturnType<typeof setInterval> | null = null;
  private currentlySpeaking: boolean = false;
  private speakingThreshold: number = 15; // Audio level threshold

  constructor() {
    this.signalChannel = new BroadcastChannel(VOICE_SIGNAL_CHANNEL);
    this.signalChannel.onmessage = (event: MessageEvent<SignalMessage>) => {
      this.handleSignal(event.data);
    };
  }

  setCallbacks(callbacks: {
    onPeerCountChange?: (count: number) => void;
    onRemoteStreamsChange?: (streams: RemoteStream[]) => void;
    onScreenShareStopped?: () => void;
    onCameraStopped?: () => void;
    onSpeakingChange?: (isSpeaking: boolean) => void;
  }) {
    this.onPeerCountChange = callbacks.onPeerCountChange;
    this.onRemoteStreamsChange = callbacks.onRemoteStreamsChange;
    this.onScreenShareStopped = callbacks.onScreenShareStopped;
    this.onCameraStopped = callbacks.onCameraStopped;
    this.onSpeakingChange = callbacks.onSpeakingChange;
  }

  async join(
  userId: string,
  serverId: string,
  channelId: string,
  existingStream?: MediaStream)
  : Promise<MediaStream> {
    if (this.isConnected) {
      this.leave();
    }

    this.userId = userId;
    this.serverId = serverId;
    this.channelId = channelId;

    if (existingStream) {
      this.localStream = existingStream;
    } else {
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: true
        });
      } catch (err) {
        console.warn(
          '[VoiceManager] Microphone unavailable, joining without audio:',
          err
        );
        // Create a silent audio stream as fallback so WebRTC connections still work
        try {
          const ctx = new AudioContext();
          const oscillator = ctx.createOscillator();
          const gain = ctx.createGain();
          gain.gain.value = 0; // silent
          oscillator.connect(gain);
          const dest = ctx.createMediaStreamDestination();
          gain.connect(dest);
          oscillator.start();
          this.localStream = dest.stream;
        } catch {
          // Last resort: empty MediaStream (peer connections may not send audio but won't crash)
          this.localStream = new MediaStream();
        }
      }
    }

    this.isConnected = true;

    // Start audio analysis for speaking detection
    this.startSpeakingDetection();

    this.broadcast({
      type: 'join',
      fromUserId: this.userId,
      serverId: this.serverId,
      channelId: this.channelId
    });

    return this.localStream;
  }

  leave() {
    if (!this.isConnected) return;

    // Stop speaking detection
    this.stopSpeakingDetection();

    this.broadcast({
      type: 'leave',
      fromUserId: this.userId,
      serverId: this.serverId,
      channelId: this.channelId
    });

    // Stop screen share
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => t.stop());
      this.screenStream = null;
    }

    // Stop camera
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach((t) => t.stop());
      this.cameraStream = null;
    }

    // Close all peer connections
    this.peers.forEach((peer) => {
      peer.audioElement.pause();
      peer.audioElement.srcObject = null;
      peer.connection.close();
    });
    this.peers.clear();

    // Stop local audio stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    this.isConnected = false;
    this.onPeerCountChange?.(0);
    this.notifyRemoteStreams();
  }

  // --- Audio controls ---

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  setDeafened(deafened: boolean) {
    this.isDeafened = deafened;
    this.peers.forEach((peer) => {
      if (!peer.isMutedLocally) {
        peer.audioElement.muted = deafened;
      }
    });
  }

  // --- Per-user mute (local only) ---

  mutePeer(userId: string) {
    const peer = this.peers.get(userId);
    if (peer) {
      peer.isMutedLocally = true;
      peer.audioElement.muted = true;
    }
  }

  unmutePeer(userId: string) {
    const peer = this.peers.get(userId);
    if (peer) {
      peer.isMutedLocally = false;
      peer.audioElement.muted = this.isDeafened;
    }
  }

  isPeerMuted(userId: string): boolean {
    return this.peers.get(userId)?.isMutedLocally ?? false;
  }

  // --- Screen sharing ---

  async startScreenShare(): Promise<MediaStream | null> {
    if (!this.isConnected) return null;

    try {
      let stream: MediaStream;

      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });
      } catch (displayErr) {
        console.warn(
          '[VoiceManager] getDisplayMedia failed (likely iframe restriction), using fallback canvas stream:',
          displayErr
        );
        // Fallback: create a canvas-based demo screen share stream
        stream = this.createFallbackScreenStream();
      }

      this.screenStream = stream;

      // When user stops sharing via browser UI (real streams only)
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          this.stopScreenShare();
          this.onScreenShareStopped?.();
        };
      }

      // Add screen track to all peer connections and renegotiate
      const renegotiatePromises: Promise<void>[] = [];
      this.peers.forEach((peer) => {
        const vTrack = stream.getVideoTracks()[0];
        if (vTrack) {
          peer.connection.addTrack(vTrack, stream);
          renegotiatePromises.push(this.renegotiate(peer));
        }
      });
      await Promise.all(renegotiatePromises);

      // Notify peers about media update
      this.broadcast({
        type: 'media-update',
        fromUserId: this.userId,
        serverId: this.serverId,
        channelId: this.channelId,
        payload: { hasScreen: true }
      });

      return stream;
    } catch (err) {
      console.error('[VoiceManager] Failed to start screen share:', err);
      return null;
    }
  }

  private createFallbackScreenStream(): MediaStream {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    this.fallbackCanvas = canvas;

    const ctx = canvas.getContext('2d')!;
    let frame = 0;

    const draw = () => {
      frame++;
      // Dark background
      ctx.fillStyle = '#1e1e2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid pattern
      ctx.strokeStyle = '#313244';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Monitor icon (simple rectangle)
      const cx = canvas.width / 2;
      const cy = canvas.height / 2 - 30;
      ctx.strokeStyle = '#cba6f7';
      ctx.lineWidth = 3;
      ctx.strokeRect(cx - 80, cy - 50, 160, 100);
      ctx.fillStyle = '#cba6f7';
      ctx.fillRect(cx - 20, cy + 50, 40, 10);
      ctx.fillRect(cx - 40, cy + 60, 80, 6);

      // Text
      ctx.fillStyle = '#cdd6f4';
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Screen Sharing Active', cx, cy + 110);

      ctx.fillStyle = '#6c7086';
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillText('Demo mode — running in sandbox environment', cx, cy + 140);

      // Animated pulse ring
      const pulseRadius = 100 + Math.sin(frame * 0.05) * 15;
      ctx.beginPath();
      ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(203, 166, 247, ${0.2 + Math.sin(frame * 0.05) * 0.1})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Timestamp
      ctx.fillStyle = '#45475a';
      ctx.font = '12px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(
        new Date().toLocaleTimeString(),
        canvas.width - 20,
        canvas.height - 20
      );

      this.fallbackAnimationId = requestAnimationFrame(draw);
    };

    draw();

    const stream = canvas.captureStream(30);
    return stream;
  }

  private cleanupFallbackCanvas() {
    if (this.fallbackAnimationId !== null) {
      cancelAnimationFrame(this.fallbackAnimationId);
      this.fallbackAnimationId = null;
    }
    this.fallbackCanvas = null;
  }

  stopScreenShare() {
    if (!this.screenStream) return;

    const tracks = this.screenStream.getTracks();

    // Remove screen tracks from peer connections and renegotiate
    const renegotiatePromises: Promise<void>[] = [];
    this.peers.forEach((peer) => {
      const senders = peer.connection.getSenders();
      senders.forEach((sender) => {
        if (sender.track && tracks.includes(sender.track)) {
          peer.connection.removeTrack(sender);
        }
      });
      renegotiatePromises.push(this.renegotiate(peer));
    });
    Promise.all(renegotiatePromises).catch((err) =>
    console.warn(
      '[VoiceManager] Renegotiation after stop screen share failed:',
      err
    )
    );

    tracks.forEach((t) => t.stop());
    this.screenStream = null;
    this.cleanupFallbackCanvas();

    this.broadcast({
      type: 'media-update',
      fromUserId: this.userId,
      serverId: this.serverId,
      channelId: this.channelId,
      payload: { hasScreen: false }
    });
  }

  // --- Camera ---

  async startCamera(): Promise<MediaStream | null> {
    if (!this.isConnected) return null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.cameraStream = stream;

      stream.getVideoTracks()[0].onended = () => {
        this.stopCamera();
        this.onCameraStopped?.();
      };

      // Add camera track to all peer connections and renegotiate
      const renegotiatePromises: Promise<void>[] = [];
      this.peers.forEach((peer) => {
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          peer.connection.addTrack(videoTrack, stream);
          renegotiatePromises.push(this.renegotiate(peer));
        }
      });
      await Promise.all(renegotiatePromises);

      this.broadcast({
        type: 'media-update',
        fromUserId: this.userId,
        serverId: this.serverId,
        channelId: this.channelId,
        payload: { hasCamera: true }
      });

      return stream;
    } catch (err) {
      console.warn('[VoiceManager] Camera unavailable:', err);
      return null;
    }
  }

  stopCamera() {
    if (!this.cameraStream) return;

    const tracks = this.cameraStream.getTracks();

    const renegotiatePromises: Promise<void>[] = [];
    this.peers.forEach((peer) => {
      const senders = peer.connection.getSenders();
      senders.forEach((sender) => {
        if (sender.track && tracks.includes(sender.track)) {
          peer.connection.removeTrack(sender);
        }
      });
      renegotiatePromises.push(this.renegotiate(peer));
    });
    Promise.all(renegotiatePromises).catch((err) =>
    console.warn(
      '[VoiceManager] Renegotiation after stop camera failed:',
      err
    )
    );

    tracks.forEach((t) => t.stop());
    this.cameraStream = null;

    this.broadcast({
      type: 'media-update',
      fromUserId: this.userId,
      serverId: this.serverId,
      channelId: this.channelId,
      payload: { hasCamera: false }
    });
  }

  // --- Getters ---

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getScreenStream(): MediaStream | null {
    return this.screenStream;
  }

  getCameraStream(): MediaStream | null {
    return this.cameraStream;
  }

  getPeerCount(): number {
    return this.peers.size;
  }

  getRemoteStreams(): RemoteStream[] {
    const streams: RemoteStream[] = [];
    this.peers.forEach((peer) => {
      const videoTracks = peer.remoteStream.getVideoTracks();
      streams.push({
        userId: peer.userId,
        stream: peer.remoteStream,
        hasVideo: videoTracks.length > 0,
        hasScreen: false // We can't easily distinguish, treat all video as video
      });
    });
    return streams;
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }

  getChannelId(): string {
    return this.channelId;
  }

  destroy() {
    this.stopSpeakingDetection();
    this.leave();
    this.signalChannel.close();
  }

  // --- Private methods ---

  private broadcast(message: SignalMessage) {
    try {
      this.signalChannel.postMessage(message);
    } catch (err) {
      // If the BroadcastChannel was closed (e.g. destroy() called elsewhere),
      // recreate it and retry once.
      if (err instanceof DOMException && err.name === 'InvalidStateError') {
        console.warn(
          '[VoiceManager] BroadcastChannel was closed, recreating...'
        );
        this.signalChannel = new BroadcastChannel(VOICE_SIGNAL_CHANNEL);
        this.signalChannel.onmessage = (event: MessageEvent<SignalMessage>) => {
          this.handleSignal(event.data);
        };
        try {
          this.signalChannel.postMessage(message);
        } catch (retryErr) {
          console.error(
            '[VoiceManager] Failed to broadcast after recreating channel:',
            retryErr
          );
        }
      } else {
        console.error('[VoiceManager] Failed to broadcast:', err);
      }
    }
  }

  private send(message: SignalMessage) {
    try {
      this.signalChannel.postMessage(message);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'InvalidStateError') {
        console.warn(
          '[VoiceManager] BroadcastChannel was closed, recreating...'
        );
        this.signalChannel = new BroadcastChannel(VOICE_SIGNAL_CHANNEL);
        this.signalChannel.onmessage = (event: MessageEvent<SignalMessage>) => {
          this.handleSignal(event.data);
        };
        try {
          this.signalChannel.postMessage(message);
        } catch (retryErr) {
          console.error(
            '[VoiceManager] Failed to send after recreating channel:',
            retryErr
          );
        }
      } else {
        console.error('[VoiceManager] Failed to send:', err);
      }
    }
  }

  private notifyRemoteStreams() {
    this.onRemoteStreamsChange?.(this.getRemoteStreams());
  }

  /**
   * Renegotiate a peer connection after tracks have been added or removed.
   * Creates a new offer and sends it so the remote peer picks up the change.
   */
  private async renegotiate(peer: PeerConnection): Promise<void> {
    try {
      const offer = await peer.connection.createOffer();
      await peer.connection.setLocalDescription(offer);
      this.send({
        type: 'offer',
        fromUserId: this.userId,
        toUserId: peer.userId,
        serverId: this.serverId,
        channelId: this.channelId,
        payload: { sdp: { type: offer.type, sdp: offer.sdp } }
      });
    } catch (err) {
      console.error(
        `[VoiceManager] Renegotiation with ${peer.userId} failed:`,
        err
      );
    }
  }

  private async handleSignal(message: SignalMessage) {
    if (message.fromUserId === this.userId) return;

    if (
    message.serverId !== this.serverId ||
    message.channelId !== this.channelId)
    {
      if (message.type !== 'join') return;
    }

    switch (message.type) {
      case 'join':
        await this.handlePeerJoin(message);
        break;
      case 'leave':
        this.handlePeerLeave(message);
        break;
      case 'offer':
        if (message.toUserId === this.userId) {
          await this.handleOffer(message);
        }
        break;
      case 'answer':
        if (message.toUserId === this.userId) {
          await this.handleAnswer(message);
        }
        break;
      case 'ice-candidate':
        if (message.toUserId === this.userId) {
          await this.handleIceCandidate(message);
        }
        break;
      case 'media-update':
        this.notifyRemoteStreams();
        break;
    }
  }

  private async handlePeerJoin(message: SignalMessage) {
    if (!this.isConnected) return;
    if (
    message.serverId !== this.serverId ||
    message.channelId !== this.channelId)

    return;

    const peer = this.createPeerConnection(message.fromUserId);

    try {
      const offer = await peer.connection.createOffer();
      await peer.connection.setLocalDescription(offer);

      this.send({
        type: 'offer',
        fromUserId: this.userId,
        toUserId: message.fromUserId,
        serverId: this.serverId,
        channelId: this.channelId,
        payload: { sdp: { type: offer.type, sdp: offer.sdp } }
      });
    } catch (err) {
      console.error('[VoiceManager] Failed to create offer:', err);
    }
  }

  private handlePeerLeave(message: SignalMessage) {
    const peer = this.peers.get(message.fromUserId);
    if (peer) {
      peer.audioElement.pause();
      peer.audioElement.srcObject = null;
      peer.connection.close();
      this.peers.delete(message.fromUserId);
      this.onPeerCountChange?.(this.peers.size);
      this.notifyRemoteStreams();
    }
  }

  private async handleOffer(message: SignalMessage) {
    if (!this.isConnected) return;

    const existingPeer = this.peers.get(message.fromUserId);
    if (existingPeer) {
      existingPeer.connection.close();
      existingPeer.audioElement.pause();
      existingPeer.audioElement.srcObject = null;
      this.peers.delete(message.fromUserId);
    }

    const peer = this.createPeerConnection(message.fromUserId);

    try {
      await peer.connection.setRemoteDescription(
        new RTCSessionDescription(message.payload.sdp)
      );

      const answer = await peer.connection.createAnswer();
      await peer.connection.setLocalDescription(answer);

      this.send({
        type: 'answer',
        fromUserId: this.userId,
        toUserId: message.fromUserId,
        serverId: this.serverId,
        channelId: this.channelId,
        payload: { sdp: { type: answer.type, sdp: answer.sdp } }
      });
    } catch (err) {
      console.error('[VoiceManager] Failed to handle offer:', err);
    }
  }

  private async handleAnswer(message: SignalMessage) {
    const peer = this.peers.get(message.fromUserId);
    if (!peer) return;

    try {
      await peer.connection.setRemoteDescription(
        new RTCSessionDescription(message.payload.sdp)
      );
    } catch (err) {
      console.error('[VoiceManager] Failed to handle answer:', err);
    }
  }

  private async handleIceCandidate(message: SignalMessage) {
    const peer = this.peers.get(message.fromUserId);
    if (!peer) return;

    try {
      await peer.connection.addIceCandidate(
        new RTCIceCandidate(message.payload.candidate)
      );
    } catch (err) {
      console.error('[VoiceManager] Failed to add ICE candidate:', err);
    }
  }

  private createPeerConnection(remoteUserId: string): PeerConnection {
    const connection = new RTCPeerConnection(ICE_SERVERS);
    const remoteStream = new MediaStream();
    const audioElement = new Audio();
    audioElement.autoplay = true;
    audioElement.muted = this.isDeafened;

    const peer: PeerConnection = {
      userId: remoteUserId,
      connection,
      remoteStream,
      audioElement,
      isMutedLocally: false
    };

    // Add local audio tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        connection.addTrack(track, this.localStream!);
      });
    }

    // Add screen share tracks if active
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => {
        connection.addTrack(track, this.screenStream!);
      });
    }

    // Add camera tracks if active
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach((track) => {
        connection.addTrack(track, this.cameraStream!);
      });
    }

    // Handle remote tracks
    connection.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });
      // Set audio source
      if (event.track.kind === 'audio') {
        audioElement.srcObject = new MediaStream([event.track]);
        audioElement.play().catch((err) => {
          console.warn('[VoiceManager] Audio autoplay blocked:', err);
        });
      }
      this.onPeerCountChange?.(this.peers.size);
      this.notifyRemoteStreams();
    };

    // Handle ICE candidates
    connection.onicecandidate = (event) => {
      if (event.candidate) {
        this.send({
          type: 'ice-candidate',
          fromUserId: this.userId,
          toUserId: remoteUserId,
          serverId: this.serverId,
          channelId: this.channelId,
          payload: { candidate: event.candidate.toJSON() }
        });
      }
    };

    connection.onconnectionstatechange = () => {
      if (
      connection.connectionState === 'disconnected' ||
      connection.connectionState === 'failed')
      {
        this.handlePeerLeave({
          type: 'leave',
          fromUserId: remoteUserId,
          serverId: this.serverId,
          channelId: this.channelId
        });
      }
    };

    this.peers.set(remoteUserId, peer);
    this.onPeerCountChange?.(this.peers.size);

    return peer;
  }

  // --- Speaking Detection ---

  private startSpeakingDetection() {
    if (!this.localStream) return;

    try {
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(this.localStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.4;
      source.connect(this.analyser);

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      this.speakingCheckInterval = setInterval(() => {
        if (!this.analyser || this.isMuted) {
          if (this.currentlySpeaking) {
            this.currentlySpeaking = false;
            this.onSpeakingChange?.(false);
          }
          return;
        }

        this.analyser.getByteFrequencyData(dataArray);
        // Calculate average volume level
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;

        const wasSpeaking = this.currentlySpeaking;
        this.currentlySpeaking = average > this.speakingThreshold;

        if (wasSpeaking !== this.currentlySpeaking) {
          this.onSpeakingChange?.(this.currentlySpeaking);
        }
      }, 150); // Check every 150ms for responsive detection
    } catch (err) {
      console.warn('[VoiceManager] Failed to start speaking detection:', err);
    }
  }

  private stopSpeakingDetection() {
    if (this.speakingCheckInterval) {
      clearInterval(this.speakingCheckInterval);
      this.speakingCheckInterval = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyser = null;
    this.currentlySpeaking = false;
  }
}

// Singleton instance
export const voiceManager = new VoiceManager();