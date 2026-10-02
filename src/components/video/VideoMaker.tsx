import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { SITE } from '../../../site.config';
import { gsap, prefersReducedMotion } from '../../utils/gsap';
import { WeddingData } from '../../types/wedding';
import { resolveDesign } from '../../utils/design';
import { TemplateDefinition } from '../../types/template';
import { WEDDING_MUSIC_TRACKS } from '../../data/musicTracks';
import { entitlements } from '../../data/pricing';
import { AppView } from '../../hooks/useWeddingState';
import { weddingAudio } from '../../utils/audioEngine';
import { Aspect, canExportVideo, renderVideo, videoScenes } from '../../utils/videoExport';
import { Play, Pause, RotateCcw, Download, Music, Smartphone, Monitor, Square, Volume2, VolumeX, ArrowLeft, Check, Sparkles, Lock } from 'lucide-react';
import { RoyalArchSVG, LotusMotifSVG } from '../common/Motifs';

interface VideoMakerProps {
  weddingData: WeddingData;
  activeTemplate: TemplateDefinition;
  setCurrentView: (view: AppView) => void;
  onOpenCheckout?: (plan?: 'digital_classic' | 'royal_suite') => void;
  /** The couple entered their names and date; until then the preview shows placeholders and can't be exported. */
  hasDetails: boolean;
}

export const VideoMaker: React.FC<VideoMakerProps> = ({ weddingData, activeTemplate, setCurrentView, onOpenCheckout, hasDetails }) => {
  const [aspectRatio, setAspectRatio] = useState<Aspect>('9:16');
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [selectedMusicId, setSelectedMusicId] = useState(weddingData.selectedMusicId || 'track-royal-shehnai');
  // Muted until the couple asks: browsers block sound that starts without a tap anyway.
  const [isMuted, setIsMuted] = useState(true);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exported, setExported] = useState<{ url: string; name: string } | null>(null);
  const [exportError, setExportError] = useState('');

  const design = useMemo(() => resolveDesign(activeTemplate, weddingData.customDesign), [activeTemplate, weddingData.customDesign]);
  const { theme } = design;
  const scenes = useMemo(() => videoScenes(weddingData), [weddingData]);
  const totalDuration = scenes.reduce((acc, s) => acc + s.durationSeconds, 0);
  const sceneStarts = scenes.map((_, i) => scenes.slice(0, i).reduce((a, s) => a + s.durationSeconds, 0));
  const currentSceneIndex = Math.max(0, sceneStarts.filter((start) => progress >= start).length - 1);
  const scene = scenes[currentSceneIndex];
  const currentTrack = WEDDING_MUSIC_TRACKS.find((t) => t.id === selectedMusicId) || WEDDING_MUSIC_TRACKS[0];
  const canDownload = entitlements(weddingData.plan).videoExport;
  const isExporting = exportProgress !== null;

  // Playback clock (paused while exporting so the preview doesn't fight the recorder for frames).
  useEffect(() => {
    if (!isPlaying || isExporting) return;
    const interval = setInterval(() => setProgress((prev) => (prev + 0.1 >= totalDuration ? 0 : prev + 0.1)), 100);
    return () => clearInterval(interval);
  }, [isPlaying, isExporting, totalDuration]);

  // Soundtrack follows play/mute and the chosen track.
  useEffect(() => {
    weddingAudio.setTrack(currentTrack);
    if ((isPlaying && !isMuted) || isExporting) weddingAudio.play();
    else weddingAudio.stop();
  }, [isPlaying, isMuted, isExporting, currentTrack]);
  useEffect(() => () => weddingAudio.stop(), []);

  const handleSeekScene = (index: number) => setProgress(sceneStarts[index] + 0.05);

  const handleExport = async () => {
    if (!canDownload) return onOpenCheckout?.('royal_suite');
    if (!hasDetails) return setExportError('Add your names and wedding date first (step “Add details”), so the video is yours.');
    setExportError('');
    setExported(null);
    setExportProgress(0);
    try {
      weddingAudio.setTrack(currentTrack);
      const audio = weddingAudio.captureStream();
      const { blob, extension } = await renderVideo({ data: weddingData, design, aspect: aspectRatio, audio, onProgress: setExportProgress });
      const name = `${weddingData.customSlug || 'wedding'}-invitation-${aspectRatio.replace(':', 'x')}.${extension}`;
      setExported({ url: URL.createObjectURL(blob), name });
    } catch (e) {
      setExportError((e as Error).message || 'Export failed. Please try again in Chrome, Edge or Safari.');
    } finally {
      setExportProgress(null);
    }
  };

  // Scene choreography: content lines rise out of a blur; the backdrop gets a Ken Burns push
  // lasting the scene's own duration. Both follow play/pause.
  const sceneRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLImageElement>(null);
  const sceneTl = useRef<gsap.core.Timeline | null>(null);
  useLayoutEffect(() => {
    const lines = sceneRef.current?.children;
    if (!lines || !backdropRef.current || prefersReducedMotion()) return;
    const dir = currentSceneIndex % 2 ? 1 : -1;
    const tl = gsap
      .timeline({ paused: !isPlaying })
      .fromTo(backdropRef.current, { scale: 1.22, xPercent: 3 * dir }, { scale: 1.04, xPercent: 0, duration: scene.durationSeconds, ease: 'none' }, 0)
      .from(lines, { autoAlpha: 0, y: 26, filter: 'blur(10px)', stagger: 0.14, duration: 1.1 }, 0.1);
    sceneTl.current = tl;
    return () => {
      tl.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSceneIndex, aspectRatio]);
  useEffect(() => {
    sceneTl.current?.paused(!isPlaying);
  }, [isPlaying]);

  const ASPECTS: { id: Aspect; icon: typeof Smartphone; title: string }[] = [
    { id: '9:16', icon: Smartphone, title: 'Stories, Reels & WhatsApp Status' },
    { id: '1:1', icon: Square, title: 'Square post' },
    { id: '16:9', icon: Monitor, title: 'Widescreen' },
  ];

  return (
    <div className="min-h-screen bg-[#141210] text-[#FAF8F5] pb-20">
      {/* Top Bar */}
      <div className="bg-[#1C1815] border-b border-white/10 px-4 sm:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentView('landing')} className="flex items-center gap-1.5 text-xs text-[#D4C3A3] hover:text-white cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
          <div className="h-4 w-[1px] bg-white/20 hidden sm:block" />
          <span className="text-xs font-serif text-[#FAF8F5] hidden sm:block truncate max-w-xs">
            Video Studio · <strong className="text-[#C9A45C]">{activeTemplate.name}</strong>
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          <div className="flex items-center bg-black/40 rounded-lg p-0.5 sm:p-1 border border-white/10">
            {ASPECTS.map(({ id, icon: Icon, title }) => (
              <button
                key={id}
                onClick={() => setAspectRatio(id)}
                disabled={isExporting}
                title={title}
                className={`px-2 sm:px-2.5 py-1 rounded text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                  aspectRatio === id ? 'bg-[#C9A45C] text-[#191614] font-semibold' : 'text-white/70 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{id}</span>
              </button>
            ))}
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting || !canExportVideo()}
            className="px-3.5 sm:px-4 py-1.5 sm:py-2 bg-[#B38B45] hover:bg-[#8F6D31] text-[#191614] font-semibold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1.5 shadow-md cursor-pointer whitespace-nowrap min-h-[36px] disabled:opacity-60"
            title={canDownload ? 'Render and download the video' : 'Included in Royal Cinema & Suite'}
          >
            {canDownload ? <Download className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{isExporting ? `Rendering ${Math.round(exportProgress! * 100)}%` : canDownload ? 'Download video' : 'Download (Royal)'}</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Controls & Soundtracks */}
          <div className="lg:col-span-4 space-y-5 order-2 lg:order-1">
            {(isExporting || exported || exportError || !canExportVideo()) && (
              <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-100 text-xs space-y-2">
                {isExporting && (
                  <>
                    <div className="font-semibold text-white">Rendering your video in 1080p…</div>
                    <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                      <div className="h-full bg-emerald-400" style={{ width: `${exportProgress! * 100}%` }} />
                    </div>
                    <p className="text-emerald-300/80">It records in real time (about {Math.round(totalDuration)} seconds). Keep this tab open.</p>
                  </>
                )}
                {exported && (
                  <>
                    <div className="font-semibold flex items-center gap-1.5 text-white">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Your video is ready</span>
                    </div>
                    <a href={exported.url} download={exported.name} className="block w-full py-2 text-center bg-emerald-500 hover:bg-emerald-600 text-black font-semibold rounded-lg">
                      Save {exported.name.endsWith('.mp4') ? 'MP4' : 'video'}
                    </a>
                    {exported.name.endsWith('.webm') && <p className="text-emerald-300/80">Saved as WebM (your browser can&rsquo;t record MP4). WhatsApp accepts it on Android; for iPhone, export from Safari.</p>}
                  </>
                )}
                {exportError && <p className="text-rose-200">{exportError}</p>}
                {!canExportVideo() && <p className="text-amber-200">This browser can&rsquo;t record video. Use a recent Chrome, Edge or Safari.</p>}
              </div>
            )}

            {!canDownload && (
              <div className="p-4 rounded-xl border border-[#C9A45C]/40 bg-[#C9A45C]/10 text-xs space-y-2">
                <p className="text-white font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#C9A45C]" /> Preview is free. Downloading is part of Royal Cinema &amp; Suite.
                </p>
                <p className="text-white/70">A 1080p video with your names, dates and photos, in all three formats, ready for WhatsApp Status and Reels.</p>
                {onOpenCheckout && (
                  <button onClick={() => onOpenCheckout('royal_suite')} className="w-full py-2 bg-[#C9A45C] hover:bg-[#B38B45] text-[#191614] font-semibold rounded-lg cursor-pointer">
                    Unlock the download
                  </button>
                )}
              </div>
            )}

            {/* Soundtrack Selector */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#1D1916] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#C9A45C] flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5" />
                  <span>Soundtrack</span>
                </span>
                <button onClick={() => setIsMuted(!isMuted)} className="text-xs text-white/70 hover:text-white flex items-center gap-1 cursor-pointer">
                  {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>{isMuted ? 'Tap to listen' : 'Sound on'}</span>
                </button>
              </div>

              <div className="space-y-2 pt-1">
                {WEDDING_MUSIC_TRACKS.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => setSelectedMusicId(track.id)}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs transition-colors flex items-center justify-between cursor-pointer ${
                      track.id === selectedMusicId ? 'border-[#C9A45C] bg-[#C9A45C]/10 text-white' : 'border-white/5 bg-black/20 text-white/70 hover:bg-white/5'
                    }`}
                  >
                    <div>
                      <div className="font-medium text-white">{track.title}</div>
                      <div className="text-[10px] text-[#D4C3A3]">{track.mood}</div>
                    </div>
                    {track.id === selectedMusicId && <span className="text-[10px] font-semibold text-[#C9A45C]">Selected</span>}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-white/40">Original music composed live by {SITE.name}. Free to share anywhere.</p>
            </div>

            {/* Scene Navigator */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#1D1916] border border-white/10 space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#C9A45C] block">Scenes ({scenes.length})</span>
              <div className="grid grid-cols-2 sm:grid-cols-1 gap-2">
                {scenes.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => handleSeekScene(i)}
                    className={`p-2.5 rounded-lg text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      currentSceneIndex === i ? 'bg-[#C9A45C] text-[#191614] font-semibold' : 'bg-black/20 text-white/80 hover:bg-white/5'
                    }`}
                  >
                    <span className="truncate">0{i + 1}. {s.title}</span>
                    <span className="text-[10px] opacity-75 shrink-0 ml-1">{s.durationSeconds}s</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Video Stage */}
          <div className="lg:col-span-8 flex flex-col items-center order-1 lg:order-2 w-full">
            <div
              className={`relative overflow-hidden rounded-3xl shadow-2xl border-2 sm:border-4 border-[#3A322A] bg-black flex flex-col justify-between transition-all w-full ${
                aspectRatio === '9:16' ? 'max-w-[310px] sm:max-w-[360px] aspect-[9/16]' : aspectRatio === '1:1' ? 'max-w-[320px] sm:max-w-[460px] aspect-square' : 'max-w-[620px] aspect-[16/9]'
              }`}
              style={{ fontFamily: `"${design.fonts.body}", system-ui, sans-serif` }}
            >
              <div className="absolute inset-0">
                <img
                  ref={backdropRef}
                  src={(scene.photo === 'couple' ? weddingData.couplePhotoUrl : weddingData.coverPhotoUrl) || weddingData.couplePhotoUrl || undefined}
                  alt=""
                  className={`w-full h-full object-cover opacity-50 ${weddingData.couplePhotoUrl || weddingData.coverPhotoUrl ? '' : 'hidden'}`}
                />
                <div className="absolute inset-0 opacity-55" style={{ backgroundColor: theme.primary }} />
                <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/90" />
              </div>

              <div className="relative z-10 p-4 sm:p-6 flex items-center justify-between text-xs" style={{ color: theme.secondary }}>
                <div className="flex items-center gap-1.5 truncate">
                  <LotusMotifSVG className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" color={theme.secondary} />
                  <span className="uppercase tracking-widest text-[9px] sm:text-[10px] truncate">{weddingData.hashtag}</span>
                </div>
              </div>

              <div ref={sceneRef} key={scene.id} className="relative z-10 px-5 sm:px-8 text-center text-white my-auto space-y-2 sm:space-y-3">
                {scene.id === 'intro' && (
                  <div className="max-w-[140px] sm:max-w-[180px] mx-auto opacity-70">
                    <RoyalArchSVG color={theme.secondary} />
                  </div>
                )}
                <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em]" style={{ color: theme.secondary }}>
                  {scene.kicker}
                </p>
                {scene.heading && (
                  <h2 className="whitespace-pre-line text-2xl sm:text-4xl leading-tight text-[#FAF8F5]" style={{ fontFamily: `"${design.fonts.heading}", Georgia, serif` }}>
                    {scene.heading}
                  </h2>
                )}
                {scene.lines.map((l) => (
                  <p key={l} className={scene.id === 'events' ? 'mx-auto max-w-xs rounded bg-black/40 px-3 py-1.5 text-[11px] sm:text-xs' : 'text-[10px] sm:text-xs text-white/85'}>
                    {l}
                  </p>
                ))}
              </div>

              <div className="relative z-10 p-3 sm:p-4 bg-gradient-to-t from-black to-transparent">
                <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden mb-1.5">
                  <div className="h-full bg-[#C9A45C]" style={{ width: `${(progress / totalDuration) * 100}%` }} />
                </div>
                <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-white/70 font-mono">
                  <span>Scene {currentSceneIndex + 1} / {scenes.length}</span>
                  <span>{progress.toFixed(1)}s / {totalDuration}s</span>
                </div>
              </div>
            </div>

            <div className="mt-5 sm:mt-6 flex items-center gap-3 sm:gap-4">
              <button onClick={() => handleSeekScene(0)} className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer" title="Restart">
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-3.5 sm:p-4 rounded-full bg-[#C9A45C] hover:bg-[#B38B45] text-[#191614] shadow-lg transition-transform hover:scale-105 cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>
              <button
                onClick={() => handleSeekScene((currentSceneIndex + 1) % scenes.length)}
                className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors text-xs font-semibold px-3 sm:px-4 cursor-pointer"
              >
                Next Scene
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
