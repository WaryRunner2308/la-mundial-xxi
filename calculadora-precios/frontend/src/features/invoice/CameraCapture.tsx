import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Camera, X, Image, Scan, StickyNote } from 'lucide-react';

// Igual que el límite del servidor (api/scan-invoice.ts). Si se cambia allá,
// cambiarlo aquí: el servidor recorta y el usuario no vería por qué.
const MAX_NOTAS = 1200;

interface CameraCaptureProps {
  onCapture: (blob: Blob, notas: string) => void;
}

export function CameraCapture({ onCapture }: CameraCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  // Indicaciones libres para la IA sobre ESTA factura
  const [notas, setNotas] = useState('');

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const openCamera = useCallback(async () => {
    setCameraError(null);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError('No se pudo acceder a la cámara. Usa la opción de subir archivo.');
      setShowCamera(false);
    }
  }, []);

  const captureFromCamera = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);

    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), 'image/png')
    );

    stopCamera();
    setShowCamera(false);

    const url = URL.createObjectURL(blob);
    setPreview(url);
    setPreviewBlob(blob);
  }, [stopCamera]);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    setPreviewBlob(file);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleConfirm = useCallback(() => {
    if (previewBlob) onCapture(previewBlob, notas);
  }, [previewBlob, notas, onCapture]);

  const handleClear = useCallback(() => {
    setPreview(null);
    setPreviewBlob(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  return (
    <>
      <AnimatePresence mode="wait">
        {!preview ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4"
          >
            {/* Drag & drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className="relative flex flex-col items-center justify-center gap-4 p-10 md:p-14 rounded-2xl cursor-pointer transition-all duration-200 select-none"
              style={{
                background: isDragging
                  ? 'rgba(0,154,58,0.06)'
                  : '#161b22',
                border: isDragging
                  ? '2px dashed rgba(0,154,58,0.5)'
                  : '2px dashed rgba(255,255,255,0.1)',
                boxShadow: isDragging
                  ? '0 0 0 4px rgba(0,154,58,0.08), 0 4px 24px rgba(0,0,0,0.3)'
                  : '0 4px 24px rgba(0,0,0,0.3)',
              }}
            >
              <motion.div
                animate={{ scale: isDragging ? 1.12 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{
                  background: isDragging ? 'rgba(0,154,58,0.12)' : 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <Image size={36} style={{ color: isDragging ? '#009A3A' : '#484f58' }} />
              </motion.div>

              <div className="text-center">
                <p className="font-black text-[#e6edf3] uppercase tracking-wide"
                  style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.1rem' }}>
                  {isDragging ? 'Suelta aquí' : 'Arrastra la factura'}
                </p>
                <p className="text-sm text-[#8b949e] mt-1">
                  o haz clic para seleccionar un archivo
                </p>
                <p className="text-xs text-[#484f58] mt-1">
                  PNG, JPG, WEBP
                </p>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <span className="h-px flex-1 bg-white/10" />
                <span className="text-xs text-[#484f58] uppercase tracking-widest font-semibold">o</span>
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <motion.button
                type="button"
                whileHover={{ scale: 1.04, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={(e) => { e.stopPropagation(); openCamera(); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition"
                style={{
                  fontFamily: '"Barlow Condensed", sans-serif',
                  letterSpacing: '0.06em',
                  color: '#009A3A',
                  background: 'rgba(0,154,58,0.08)',
                  border: '1px solid rgba(0,154,58,0.2)',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,154,58,0.14)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,154,58,0.08)'; }}
              >
                <Camera size={15} strokeWidth={2} />
                ABRIR CÁMARA
              </motion.button>
            </div>

            {cameraError && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-center px-4 py-3 rounded-xl"
                style={{
                  color: '#C8102E',
                  background: 'rgba(200,16,46,0.07)',
                  border: '1px solid rgba(200,16,46,0.15)',
                }}
              >
                {cameraError}
              </motion.p>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileInput}
              className="hidden"
            />
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4"
          >
            <div className="relative rounded-2xl overflow-hidden"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              <img
                src={preview}
                alt="Vista previa de la factura"
                className="w-full max-h-[420px] object-contain"
                style={{ background: '#161b22' }}
              />
              <button
                onClick={handleClear}
                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition"
                style={{
                  background: 'rgba(0,0,0,0.7)',
                  backdropFilter: 'blur(4px)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#e6edf3',
                }}
                title="Quitar imagen"
              >
                <X size={14} />
              </button>
            </div>

            {/* Notas para la IA — se leen antes de analizar la factura */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div
                className="flex items-center gap-2 px-4 py-2.5"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              >
                <StickyNote size={13} style={{ color: '#fbbf24' }} />
                <span
                  className="font-black uppercase tracking-widest"
                  style={{ color: '#fbbf24', fontSize: '10px' }}
                >
                  Notas para la IA
                </span>
                <span className="text-[10px] text-[#484f58] ml-auto">Opcional</span>
              </div>

              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value.slice(0, MAX_NOTAS))}
                rows={3}
                maxLength={MAX_NOTAS}
                placeholder={
                  'Indícale algo sobre esta factura. Ejemplos:\n' +
                  '• La mantequilla Mavesa de 250g no llegó, ignórala.\n' +
                  '• Los productos de limpieza llevan IVA, los alimentos no.'
                }
                className="w-full px-4 py-3 bg-transparent text-[13px] text-[#e6edf3] outline-none resize-y placeholder-[#484f58]"
                style={{ minHeight: '76px' }}
              />

              <div
                className="flex items-center justify-between gap-3 px-4 py-2"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-[10px] text-[#484f58]">
                  La IA lee esto antes de leer la factura. No cambia el resultado a texto:
                  sigue devolviendo la lista de precios.
                </p>
                <span
                  className="text-[10px] flex-shrink-0"
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    color: notas.length >= MAX_NOTAS ? '#C8102E' : '#484f58',
                  }}
                >
                  {notas.length}/{MAX_NOTAS}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleClear}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition"
                style={{
                  fontFamily: '"Barlow Condensed", sans-serif',
                  letterSpacing: '0.06em',
                  color: '#8b949e',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <Upload size={14} />
                CAMBIAR IMAGEN
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleConfirm}
                className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition"
                style={{
                  fontFamily: '"Barlow Condensed", sans-serif',
                  letterSpacing: '0.06em',
                  background: 'linear-gradient(135deg,#009A3A,#007b2e)',
                  boxShadow: '0 4px 18px rgba(0,154,58,0.35)',
                }}
              >
                <Scan size={14} />
                ANALIZAR CON IA
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera modal */}
      <AnimatePresence>
        {showCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="w-full max-w-lg rounded-2xl overflow-hidden"
              style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <div className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 className="font-black text-[#e6edf3] uppercase tracking-wide"
                  style={{ fontFamily: '"Barlow Condensed", sans-serif' }}>
                  Cámara
                </h3>
                <button
                  onClick={() => { stopCamera(); setShowCamera(false); }}
                  className="p-1.5 rounded-lg text-[#8b949e] hover:text-[#e6edf3] transition"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="relative bg-black">
                <video
                  ref={(el) => {
                    videoRef.current = el;
                    // Aplica el stream si ya estaba disponible cuando el elemento montó
                    if (el && streamRef.current) el.srcObject = streamRef.current;
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full"
                  style={{ maxHeight: '60vh', objectFit: 'contain' }}
                />
              </div>

              <div className="p-4">
                <motion.button
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={captureFromCamera}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white text-sm"
                  style={{
                    fontFamily: '"Barlow Condensed", sans-serif',
                    letterSpacing: '0.06em',
                    background: 'linear-gradient(135deg,#009A3A,#007b2e)',
                    boxShadow: '0 4px 18px rgba(0,154,58,0.35)',
                  }}
                >
                  <Camera size={16} />
                  CAPTURAR FOTO
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
