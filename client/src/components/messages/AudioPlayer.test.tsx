import { vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AudioPlayer } from './AudioPlayer';

// Mock for HTML5 Audio element
window.HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
window.HTMLMediaElement.prototype.pause = vi.fn();
window.HTMLMediaElement.prototype.load = vi.fn();

Object.defineProperty(window.HTMLMediaElement.prototype, 'duration', {
  get: () => 120, // 2 minutes
});

Object.defineProperty(window.HTMLMediaElement.prototype, 'currentTime', {
  get: () => 30, // 30 seconds
  set: vi.fn(),
});

describe('AudioPlayer', () => {
  it('renders audio player with play button', async () => {
    render(<AudioPlayer mediaUrl="/api/media/audio/test-audio.mp3" fromMe={false} />);
    const playButton = screen.getByRole('button', { name: /reproduzir/i });
    expect(playButton).toBeInTheDocument();
  });

  it('plays audio when play button is clicked', async () => {
    render(<AudioPlayer mediaUrl="/api/media/audio/test-audio.mp3" fromMe={false} />);
    const playButton = screen.getByRole('button', { name: /reproduzir/i });
    
    // Simulate metadata loaded
    const audioElement = document.querySelector('audio');
    if (audioElement) {
      fireEvent(audioElement, new Event('loadedmetadata'));
    }
    
    await waitFor(() => expect(playButton).not.toBeDisabled());
    fireEvent.click(playButton);
    
    await waitFor(() => expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled());
  });

  it('shows waveform bars', () => {
    render(<AudioPlayer mediaUrl="/api/media/audio/test-audio.mp3" fromMe={false} />);
    // Waveform bars are rendered as divs
    const container = document.querySelector('.flex-1.min-w-0');
    expect(container).toBeInTheDocument();
    expect(container?.children.length).toBeGreaterThan(0);
  });

  it('shows download button', () => {
    render(<AudioPlayer mediaUrl="/api/media/audio/test-audio.mp3" fromMe={false} />);
    const downloadButton = screen.getByRole('button', { name: /baixar/i });
    expect(downloadButton).toBeInTheDocument();
  });

  it('handles error state', async () => {
    render(<AudioPlayer mediaUrl="/api/media/audio/test-audio.mp3" fromMe={false} />);
    const audioElement = document.querySelector('audio');
    
    if (audioElement) {
      fireEvent(audioElement, new Event('error'));
    }
    
    await waitFor(() => {
      expect(screen.getByText(/erro ao carregar áudio/i)).toBeInTheDocument();
    });
  });
});
