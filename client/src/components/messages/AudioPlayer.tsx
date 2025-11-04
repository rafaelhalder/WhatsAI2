import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Download } from 'lucide-react';

interface AudioPlayerProps {
  mediaUrl: string;
  fromMe: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ mediaUrl, fromMe }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState('0:00');
  const [duration, setDuration] = useState('0:00');
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Transform Spaces URL to proxy URL
  const getProxyUrl = (url: string): string => {
    if (url.includes('digitaloceanspaces.com') && url.includes('incoming/audio/')) {
      const pathParts = url.split('incoming/audio/');
      if (pathParts.length > 1) {
        const fileName = pathParts[1];
        return `/api/media/audio/${fileName}`;
      }
    }
    return url;
  };

  const proxyUrl = getProxyUrl(mediaUrl);

  // Generate static waveform bars (visual only)
  const waveformBars = Array.from({ length: 40 }, (_, i) => {
    const baseHeight = 20 + Math.sin(i / 3) * 10 + Math.random() * 15;
    return Math.max(10, Math.min(40, baseHeight));
  });

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setIsLoading(false);
      setDuration(formatTime(audio.duration));
    };

    const handleTimeUpdate = () => {
      setCurrentTime(formatTime(audio.currentTime));
      setProgress((audio.currentTime / audio.duration) * 100);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    const handleError = () => {
      setIsLoading(false);
      setLoadError('Erro ao carregar áudio');
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch((error) => {
        console.error('Error playing audio:', error);
        setLoadError('Erro ao reproduzir');
      });
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = proxyUrl;
    const extension = proxyUrl.includes('.mp3') ? 'mp3' : 'ogg';
    link.download = `audio.${extension}`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div 
      className={`flex items-center gap-2 p-2 rounded-lg max-w-xs ${
        fromMe ? 'bg-[#005C4B]' : 'bg-white'
      }`}
      style={{ minWidth: '250px' }}
    >
      {/* Hidden audio element */}
      <audio ref={audioRef} src={proxyUrl} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        onClick={handlePlayPause}
        disabled={isLoading || !!loadError}
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
          fromMe 
            ? 'bg-white/20 hover:bg-white/30 text-white' 
            : 'bg-[#128C7E] hover:bg-[#0F7A6A] text-white'
        } ${(isLoading || loadError) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        title={isPlaying ? 'Pausar' : 'Reproduzir'}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : loadError ? (
          <span className="text-xs">!</span>
        ) : isPlaying ? (
          <Pause size={14} fill="currentColor" />
        ) : (
          <Play size={14} fill="currentColor" className="ml-0.5" />
        )}
      </button>

      {/* Waveform visualization */}
      <div className="flex-1 min-w-0 relative h-8 flex items-center gap-[2px]">
        {loadError ? (
          <div className="text-xs text-red-500 px-2">{loadError}</div>
        ) : (
          waveformBars.map((height, index) => {
            const isPassed = progress > (index / waveformBars.length) * 100;
            return (
              <div
                key={index}
                className="flex-1 rounded-full transition-colors"
                style={{
                  height: `${height}%`,
                  backgroundColor: fromMe 
                    ? (isPassed ? '#ffffff' : '#ffffff80')
                    : (isPassed ? '#128C7E' : '#00000040'),
                }}
              />
            );
          })
        )}
      </div>

      {/* Time Display */}
      <div className={`flex-shrink-0 text-xs font-mono ${
        fromMe ? 'text-white/80' : 'text-gray-600'
      }`}>
        {isPlaying ? currentTime : duration}
      </div>

      {/* Download Button */}
      <button
        onClick={handleDownload}
        disabled={!!loadError}
        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-opacity ${
          fromMe ? 'text-white/60 hover:text-white' : 'text-gray-400 hover:text-gray-600'
        } ${(loadError) ? 'opacity-50 cursor-not-allowed' : ''}`}
        title="Baixar áudio"
      >
        <Download size={14} />
      </button>
    </div>
  );
};
