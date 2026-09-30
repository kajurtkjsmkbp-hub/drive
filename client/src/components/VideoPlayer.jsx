import { 
  Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Volume1, 
  Maximize, Minimize, Gauge, Check, Download, AlertTriangle, Film
} from 'lucide-react';

export default function VideoPlayer({ src, fileName, onDownload }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [speedNotice, setSpeedNotice] = useState('');
  const [controlsVisible, setControlsVisible] = useState(true);
  const [hasError, setHasError] = useState(false);
  const hideControlsTimer = useRef(null);

  const ext = (fileName?.split('.').pop() || '').toLowerCase();
  const isLikelyUnsupported = ['wmv', 'avi', 'flv', 'rmvb', 'vob'].includes(ext);

  const speedOptions = [
    { label: '0.5x (Lambat)', value: 0.5 },
    { label: '0.75x', value: 0.75 },
    { label: '1.0x (Normal)', value: 1.0 },
    { label: '1.25x', value: 1.25 },
    { label: '1.5x (Cepat)', value: 1.5 },
    { label: '1.75x', value: 1.75 },
    { label: '2.0x (Sangat Cepat)', value: 2.0 },
  ];

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds === 0) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused || videoRef.current.ended) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handleSeek = (e) => {
    const seekTo = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = seekTo;
      setCurrentTime(seekTo);
    }
  };

  const skipSeconds = (amount) => {
    if (!videoRef.current) return;
    const newTime = Math.min(Math.max(videoRef.current.currentTime + amount, 0), duration);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted && volume === 0) {
      setVolume(0.5);
      videoRef.current.volume = 0.5;
    }
  };

  const changeSpeed = (rate) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
    setSpeedNotice(`Kecepatan: ${rate}x`);
    setTimeout(() => setSpeedNotice(''), 2000);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        skipSeconds(10);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        skipSeconds(-10);
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isMuted, volume, duration]);

  // Handle auto-hiding controls after inactivity
  const handleMouseMove = () => {
    setControlsVisible(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    if (isPlaying) {
      hideControlsTimer.current = setTimeout(() => {
        setControlsVisible(false);
        setShowSpeedMenu(false);
      }, 3500);
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setControlsVisible(false)}
      className="relative w-full max-w-5xl mx-auto bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800 select-none group flex flex-col justify-center items-center"
      style={{ minHeight: '380px', maxHeight: '78vh' }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        preload="metadata"
        playsInline
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onError={() => setHasError(true)}
        onEnded={() => setIsPlaying(false)}
        className="w-full max-h-[75vh] object-contain cursor-pointer"
      />

      {/* Unsupported Format or Playback Error Notice */}
      {(hasError || isLikelyUnsupported) && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-slate-950/95 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Film className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-md">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Format .{ext.toUpperCase()} Memerlukan Pemutar Eksternal</span>
            </div>
            <h4 className="text-sm font-bold text-white pt-1">{fileName}</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Browser web modern (Chrome, Edge, Firefox) secara bawaan tidak dapat memutar video berformat <strong>.{ext.toUpperCase()}</strong> langsung di browser. Silakan unduh berkas ini untuk diputar menggunakan VLC atau Windows Media Player di komputer Anda.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <a
              href={src.replace('&view=inline', '')}
              download={fileName}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Video Ini</span>
            </a>
          </div>
          <p className="text-[11px] text-slate-500">
            💡 Tip: Gunakan tombol panah kiri / kanan (◀ ▶) untuk melihat berkas lain di folder ini.
          </p>
        </div>
      )}

      {/* Speed Notice Banner Badge */}
      {speedNotice && (
        <div className="absolute top-6 left-6 z-30 px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-blue-500/40 text-blue-300 font-bold text-xs backdrop-blur-md shadow-lg animate-in fade-in zoom-in-95 duration-200">
          {speedNotice}
        </div>
      )}

      {/* Big Play/Pause Center Button Overlay when Paused */}
      {!isPlaying && !hasError && !isLikelyUnsupported && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 m-auto w-18 h-18 rounded-3xl bg-blue-600/90 hover:bg-blue-500 text-white flex items-center justify-center shadow-2xl shadow-blue-500/30 transition-all transform hover:scale-110 cursor-pointer z-20 backdrop-blur-sm"
          title="Putar Video"
        >
          <Play className="w-8 h-8 fill-white ml-1" />
        </button>
      )}

      {/* Bottom Custom Player Controls Bar */}
      <div 
        className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-4 pt-8 transition-opacity duration-300 z-20 ${
          controlsVisible || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress Bar (Scrubber) */}
        <div className="relative mb-3 flex items-center group/scrubber cursor-pointer">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-slate-700/80 rounded-full appearance-none cursor-pointer accent-blue-500 focus:outline-none transition-all hover:h-2"
          />
        </div>

        {/* Control Buttons Row */}
        <div className="flex items-center justify-between text-xs text-white gap-2">
          
          {/* Left Controls: Play, Skip, Time */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="p-2 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-white"
              title={isPlaying ? 'Jeda (Spasi)' : 'Putar (Spasi)'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
            </button>

            <button
              onClick={() => skipSeconds(-10)}
              className="p-1.5 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-slate-300 hover:text-white"
              title="Mundur 10 Detik"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => skipSeconds(10)}
              className="p-1.5 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-slate-300 hover:text-white"
              title="Maju 10 Detik"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Time Stamp Display */}
            <span className="font-mono text-slate-300 text-[11px] ml-1">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right Controls: Volume, Speed Control, Fullscreen */}
          <div className="flex items-center gap-2 relative">
            
            {/* Volume Control */}
            <div className="flex items-center gap-1.5 group/vol">
              <button
                onClick={toggleMute}
                className="p-1.5 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-slate-300 hover:text-white"
                title={isMuted ? 'Nyalakan Suara (M)' : 'Bisukan Suara (M)'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-blue-500 hidden sm:block"
                title="Atur Volume"
              />
            </div>

            {/* Speed Control Button ("dicepetkan atau dilambatkan") */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer shadow-sm"
                title="Atur Kecepatan Putar"
              >
                <Gauge className="w-3.5 h-3.5 text-blue-400" />
                <span>{playbackRate}x</span>
              </button>

              {/* Speed Dropdown Menu */}
              {showSpeedMenu && (
                <div className="absolute right-0 bottom-12 w-44 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    Kecepatan Video
                  </div>
                  {speedOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => changeSpeed(opt.value)}
                      className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between transition-colors cursor-pointer ${
                        playbackRate === opt.value
                          ? 'bg-blue-600/20 text-blue-400 font-bold'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {playbackRate === opt.value && <Check className="w-3.5 h-3.5 text-blue-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-slate-300 hover:text-white"
              title={isFullscreen ? 'Keluar Layar Penuh (F)' : 'Layar Penuh (F)'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
