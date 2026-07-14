import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { X, Zap, ZapOff, RotateCcw, Check, Upload, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function CameraScreen() {
  const {
    goBack,
    flashOn,
    setFlashOn,
    cameraPreview,
    setCameraPreview,
    setScreen,
    setScanImage,
  } = useApp();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [camError, setCamError] = useState(false);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  // Start the live camera whenever we're in the viewfinder (not preview).
  useEffect(() => {
    let cancelled = false;
    if (cameraPreview) return;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        setCamError(true);
      }
    }
    start();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [cameraPreview]);

  useEffect(() => {
    return () => {
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    };
  }, [capturedUrl]);

  const openGallery = () => fileInputRef.current?.click();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    stopCamera();
    setScanImage(file);
    setScreen('processing');
  };

  const capture = () => {
    const video = videoRef.current;
    // No live frame available (permission denied / unsupported) -> upload path.
    if (!video || !video.videoWidth) {
      openGallery();
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        stopCamera();
        setScanImage(blob);
        setCapturedUrl(URL.createObjectURL(blob));
        setCameraPreview(true);
      },
      'image/jpeg',
      0.92,
    );
  };

  const retake = () => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(null);
    setScanImage(null);
    setCameraPreview(false);
  };

  const usePhoto = () => {
    setCameraPreview(false);
    setScreen('processing');
  };

  return (
    <div className="flex flex-col h-full bg-black">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'brightness(0.85)' }}
        />
        {camError && !cameraPreview && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center z-10">
            <p className="text-white/70 text-sm">
              Camera unavailable. Tap the button below to upload a menu photo
              instead.
            </p>
            <button
              onClick={openGallery}
              className="px-5 py-2.5 rounded-xl bg-[#F75A2C] text-white font-bold text-sm"
            >
              Upload Photo
            </button>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60" />

        <div className="relative flex items-center justify-between px-6 pt-14 pb-4 z-20">
          <button
            onClick={goBack}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center"
          >
            <X size={18} className="text-white" />
          </button>
          <span className="text-white font-bold text-sm tracking-wide">
            Scan Menu
          </span>
          <button
            onClick={() => setFlashOn(!flashOn)}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center"
          >
            {flashOn ? (
              <Zap size={18} className="text-yellow-400" />
            ) : (
              <ZapOff size={18} className="text-white/50" />
            )}
          </button>
        </div>

        {!cameraPreview && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="relative w-72 h-80">
              <div className="absolute top-0 left-0 w-9 h-1 bg-[#F75A2C] rounded-full" />
              <div className="absolute top-0 left-0 w-1 h-9 bg-[#F75A2C] rounded-full" />
              <div className="absolute top-0 right-0 w-9 h-1 bg-[#F75A2C] rounded-full" />
              <div className="absolute top-0 right-0 w-1 h-9 bg-[#F75A2C] rounded-full" />
              <div className="absolute bottom-0 left-0 w-9 h-1 bg-[#F75A2C] rounded-full" />
              <div className="absolute bottom-0 left-0 w-1 h-9 bg-[#F75A2C] rounded-full" />
              <div className="absolute bottom-0 right-0 w-9 h-1 bg-[#F75A2C] rounded-full" />
              <div className="absolute bottom-0 right-0 w-1 h-9 bg-[#F75A2C] rounded-full" />
              <div
                className="absolute left-2 right-2 h-px"
                style={{
                  background:
                    'linear-gradient(to right, transparent, #F75A2C, rgba(247,90,44,0.6), #F75A2C, transparent)',
                  boxShadow: '0 0 8px 2px rgba(247,90,44,0.4)',
                  animation: 'scanLine 2.2s ease-in-out infinite',
                  position: 'absolute',
                }}
              />
              <p className="absolute -bottom-9 inset-x-0 text-center text-white/50 text-xs">
                Align menu within frame
              </p>
            </div>
          </div>
        )}

        {cameraPreview && capturedUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-20 flex flex-col"
          >
            <img
              src={capturedUrl}
              alt="Captured menu"
              className="flex-1 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/15" />
            <div className="absolute bottom-0 inset-x-0 p-6 flex gap-3">
              <button
                onClick={retake}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold text-sm"
              >
                <RotateCcw size={15} /> Retake
              </button>
              <button
                onClick={usePhoto}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#F75A2C] text-white font-bold text-sm shadow-[0_4px_20px_rgba(247,90,44,0.5)]"
              >
                <Check size={15} /> Use Photo
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {!cameraPreview && (
        <div className="bg-black flex items-center justify-between px-10 py-8">
          <button
            onClick={openGallery}
            className="rounded-xl overflow-hidden border-2 border-white/20 w-12 h-12"
          >
            <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
              <Upload size={14} className="text-white/60" />
            </div>
          </button>
          <button
            onClick={capture}
            className="w-20 h-20 rounded-full bg-white flex items-center justify-center ring-4 ring-white/25 active:scale-95 transition-transform"
          >
            <div className="w-16 h-16 rounded-full border-4 border-[#F2EDE7]" />
          </button>
          {/* Flip (visual) */}
          <button className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
            <RefreshCw size={18} className="text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
