import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff,
  Camera,
  Sparkles,
  Maximize,
  Minimize
} from 'lucide-react';
import WebRTCService from '../services/webrtc';

// Video filters using CSS filters
const VIDEO_FILTERS = [
  { id: 'none', name: 'عادي', filter: 'none' },
  { id: 'grayscale', name: 'أبيض وأسود', filter: 'grayscale(100%)' },
  { id: 'sepia', name: 'سيبيا', filter: 'sepia(100%)' },
  { id: 'vintage', name: 'فينتاج', filter: 'sepia(50%) contrast(1.2)' },
  { id: 'cool', name: 'بارد', filter: 'hue-rotate(180deg)' },
  { id: 'warm', name: 'دافئ', filter: 'sepia(30%) saturate(1.4)' },
  { id: 'bright', name: 'مشرق', filter: 'brightness(1.3) contrast(1.1)' },
  { id: 'dramatic', name: 'درامي', filter: 'contrast(1.5) saturate(1.3)' },
  { id: 'blur', name: 'ضبابي', filter: 'blur(3px)' }
];

export default function VideoCall({ callId, isInitiator, recipientName, onEndCall }) {
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilter, setActiveFilter] = useState('none');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    initializeCall();
    
    // Call duration timer
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(timer);
      handleEndCall();
    };
  }, []);

  const initializeCall = async () => {
    try {
      let result;
      
      if (isInitiator) {
        result = await WebRTCService.startCall(callId, true);
      } else {
        result = await WebRTCService.answerCall(callId);
      }

      if (result.success) {
        // Set local stream
        if (localVideoRef.current && WebRTCService.localStream) {
          localVideoRef.current.srcObject = WebRTCService.localStream;
        }

        // Set remote stream
        if (remoteVideoRef.current && WebRTCService.remoteStream) {
          remoteVideoRef.current.srcObject = WebRTCService.remoteStream;
        }

        setConnectionStatus('connected');
      } else {
        setConnectionStatus('failed');
      }
    } catch (error) {
      console.error('Error initializing call:', error);
      setConnectionStatus('failed');
    }
  };

  const toggleVideo = () => {
    const enabled = WebRTCService.toggleVideo();
    setIsVideoOn(enabled);
  };

  const toggleAudio = () => {
    const enabled = WebRTCService.toggleAudio();
    setIsAudioOn(enabled);
  };

  const switchCamera = async () => {
    await WebRTCService.switchCamera();
  };

  const handleEndCall = async () => {
    await WebRTCService.endCall();
    if (onEndCall) onEndCall();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const applyFilter = (filter) => {
    setActiveFilter(filter.id);
    setShowFilters(false);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const selectedFilter = VIDEO_FILTERS.find(f => f.id === activeFilter);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-black z-50 flex flex-col"
    >
      {/* Connection Status */}
      {connectionStatus !== 'connected' && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="glass-panel px-4 py-2 rounded-full">
            {connectionStatus === 'connecting' && (
              <div className="flex items-center gap-2 text-orbitCyan">
                <div className="spinner w-4 h-4"></div>
                <span className="text-sm">جاري الاتصال...</span>
              </div>
            )}
            {connectionStatus === 'failed' && (
              <span className="text-sm text-red-400">فشل الاتصال</span>
            )}
          </div>
        </div>
      )}

      {/* Remote Video (Full Screen) */}
      <div className="flex-1 relative bg-orbitSpace">
        <video 
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
          style={{ 
            filter: selectedFilter?.filter || 'none',
            transform: 'scaleX(-1)' // Mirror effect
          }}
        />
        
        {/* Remote user info overlay */}
        <div className="absolute top-6 left-6 z-10">
          <div className="glass-panel px-4 py-2 rounded-2xl">
            <h3 className="text-white font-bold">{recipientName}</h3>
            <p className="text-xs text-orbitCyan">{formatDuration(callDuration)}</p>
          </div>
        </div>

        {/* Filter indicator */}
        {activeFilter !== 'none' && (
          <div className="absolute top-6 right-6 z-10">
            <div className="glass-panel px-3 py-1 rounded-full flex items-center gap-2">
              <Sparkles size={14} className="text-orbitPurple" />
              <span className="text-xs text-white">{selectedFilter?.name}</span>
            </div>
          </div>
        )}
      </div>

      {/* Local Video (Picture-in-Picture) */}
      <div className="absolute bottom-24 right-4 w-32 h-44 rounded-2xl overflow-hidden border-2 border-orbitCyan shadow-neonCyan z-20">
        <video 
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ 
            filter: selectedFilter?.filter || 'none',
            transform: 'scaleX(-1)' // Mirror effect
          }}
        />
        {!isVideoOn && (
          <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
            <VideoOff size={24} className="text-gray-500" />
          </div>
        )}
      </div>

      {/* Filter Selection Panel */}
      {showFilters && (
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-30">
          <div className="glass-panel-strong p-4 rounded-3xl">
            <h4 className="text-white text-sm font-bold mb-3 text-center">الفلاتر</h4>
            <div className="grid grid-cols-3 gap-2 max-w-sm">
              {VIDEO_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => applyFilter(filter)}
                  className={`px-3 py-2 rounded-xl text-xs transition-all ${
                    activeFilter === filter.id
                      ? 'bg-orbitPurple text-white font-bold'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {filter.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent z-20">
        <div className="flex items-center justify-center gap-4">
          {/* Mute Audio */}
          <button
            onClick={toggleAudio}
            className={`p-4 rounded-full transition-all ${
              isAudioOn 
                ? 'bg-white/20 hover:bg-white/30' 
                : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {isAudioOn ? (
              <Mic size={24} className="text-white" />
            ) : (
              <MicOff size={24} className="text-white" />
            )}
          </button>

          {/* End Call */}
          <button
            onClick={handleEndCall}
            className="p-6 bg-red-500 hover:bg-red-600 rounded-full transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <PhoneOff size={28} className="text-white" />
          </button>

          {/* Toggle Video */}
          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full transition-all ${
              isVideoOn 
                ? 'bg-white/20 hover:bg-white/30' 
                : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {isVideoOn ? (
              <Video size={24} className="text-white" />
            ) : (
              <VideoOff size={24} className="text-white" />
            )}
          </button>

          {/* Switch Camera */}
          <button
            onClick={switchCamera}
            className="p-4 rounded-full bg-white/20 hover:bg-white/30 transition-all"
          >
            <Camera size={24} className="text-white" />
          </button>

          {/* Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-4 rounded-full bg-white/20 hover:bg-white/30 transition-all"
          >
            <Sparkles size={24} className="text-orbitPurple" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-4 rounded-full bg-white/20 hover:bg-white/30 transition-all"
          >
            {isFullscreen ? (
              <Minimize size={24} className="text-white" />
            ) : (
              <Maximize size={24} className="text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
