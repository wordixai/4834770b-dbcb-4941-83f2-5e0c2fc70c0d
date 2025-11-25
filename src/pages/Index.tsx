import { useEffect, useRef, useState } from 'react';

interface Photo {
  id: string;
  imageData: string;
  x: number;
  y: number;
  isDeveloping: boolean;
  blessing: string;
}

export default function Index() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isEjecting, setIsEjecting] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState<Photo | null>(null);
  const [draggedPhoto, setDraggedPhoto] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const initCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 }
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error('Camera access denied:', err);
      }
    };

    initCamera();

    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || isEjecting) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to 3:4 portrait aspect ratio
    canvas.width = 600;
    canvas.height = 800;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/png');

    // Play shutter sound
    const shutterSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjGM0fPTgjMGHmm98etlHAY8jdXzzn0pBSp+zPDaizsIGGS58OZ9MwYnfMjw3Y0+CRZiv+3mcyIGKHzK79+PQAoVYbzs6nMkBip7yvDeji8IHWu98OJyJgYrfMrt4Y5AChVgu+vpdiQGK3vJ8N+OLwgea7zv43IlBit8ye3gjkAKFWG76+l3JAYre8nw345ACBQ=');
    shutterSound.play().catch(() => {});

    // Generate blessing based on browser language
    const userLang = navigator.language.split('-')[0];
    const blessing = await generateBlessing(userLang);

    const newPhoto: Photo = {
      id: Date.now().toString(),
      imageData,
      x: 0,
      y: 0,
      isDeveloping: true,
      blessing
    };

    setCurrentPhoto(newPhoto);
    setIsEjecting(true);

    // Start ejection animation
    setTimeout(() => {
      setIsEjecting(false);
    }, 1000);

    // Developing effect - clear after 3 seconds
    setTimeout(() => {
      setCurrentPhoto(prev => prev ? { ...prev, isDeveloping: false } : null);
    }, 3000);
  };

  const generateBlessing = async (lang: string): Promise<string> => {
    // Fallback blessings in different languages
    const blessings: { [key: string]: string[] } = {
      en: [
        'What a beautiful moment!',
        'Keep smiling, you look amazing!',
        'This memory will last forever!',
        'Pure joy captured in time!',
        'Treasure this precious moment!'
      ],
      zh: [
        '美好的瞬间！',
        '保持微笑，你真棒！',
        '珍贵的回忆！',
        '时光定格在此刻！',
        '愿这份美好永存！'
      ],
      es: [
        '¡Qué momento tan hermoso!',
        '¡Sigue sonriendo!',
        '¡Un recuerdo precioso!',
        '¡Alegría pura capturada!',
        '¡Atesora este momento!'
      ],
      fr: [
        'Quel beau moment!',
        'Continue de sourire!',
        'Un souvenir précieux!',
        'Pure joie capturée!',
        'Chéris ce moment!'
      ],
      de: [
        'Was für ein schöner Moment!',
        'Bleib lächelnd!',
        'Eine wertvolle Erinnerung!',
        'Pure Freude eingefangen!',
        'Schätze diesen Moment!'
      ],
      ja: [
        '素敵な瞬間！',
        '笑顔でいてね！',
        '大切な思い出！',
        '喜びの瞬間！',
        'この瞬間を大切に！'
      ]
    };

    const langBlessings = blessings[lang] || blessings['en'];
    return langBlessings[Math.floor(Math.random() * langBlessings.length)];
  };

  const handlePhotoMouseDown = (e: React.MouseEvent, photoId: string) => {
    e.preventDefault();
    const photo = photos.find(p => p.id === photoId) || currentPhoto;
    if (!photo) return;

    const rect = (e.target as HTMLElement).closest('[data-photo]')?.getBoundingClientRect();
    if (!rect) return;

    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setDraggedPhoto(photoId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedPhoto) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    if (draggedPhoto === currentPhoto?.id) {
      setCurrentPhoto(prev => prev ? { ...prev, x: newX, y: newY } : null);
    } else {
      setPhotos(prev =>
        prev.map(p =>
          p.id === draggedPhoto ? { ...p, x: newX, y: newY } : p
        )
      );
    }
  };

  const handleMouseUp = () => {
    if (draggedPhoto && currentPhoto && draggedPhoto === currentPhoto.id) {
      // Move photo from camera to wall
      setPhotos(prev => [...prev, currentPhoto]);
      setCurrentPhoto(null);
    }
    setDraggedPhoto(null);
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-[hsl(var(--retro-bg-start))] to-[hsl(var(--retro-bg-end))] relative overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Title */}
      <h1 className="text-6xl text-center pt-12 text-[hsl(var(--retro-text))] font-handwritten font-bold">
        Bao Retro Camera
      </h1>

      {/* Instructions */}
      <div className="fixed bottom-8 right-8 text-right text-[hsl(var(--retro-text-light))] font-handwritten text-lg max-w-xs z-10">
        <p className="mb-2">1. Click the shutter button</p>
        <p className="mb-2">2. Wait for photo to develop</p>
        <p>3. Drag photo to the wall</p>
      </div>

      {/* Photo Wall - dragged photos */}
      {photos.map(photo => (
        <div
          key={photo.id}
          data-photo
          className="fixed cursor-move z-40"
          style={{
            left: `${photo.x}px`,
            top: `${photo.y}px`,
            width: '200px'
          }}
          onMouseDown={(e) => handlePhotoMouseDown(e, photo.id)}
        >
          <div className="bg-white p-3 shadow-2xl" style={{ aspectRatio: '3/4' }}>
            <div className="relative w-full h-4/5 bg-gray-100 overflow-hidden">
              <img
                src={photo.imageData}
                alt="Captured moment"
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-center text-sm mt-2 font-handwritten text-gray-800">
              {photo.blessing}
            </p>
          </div>
        </div>
      ))}

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Main Camera Container */}
      <div
        className="fixed z-20 select-none"
        style={{
          bottom: '64px',
          left: '64px',
          width: '450px',
          height: '450px'
        }}
      >
        {/* Camera Background Image */}
        <img
          src="https://s.baoyu.io/images/retro-camera.webp"
          alt="Retro Camera"
          className="absolute w-full h-full object-contain pointer-events-none"
          style={{ left: 0, bottom: 0 }}
          draggable="false"
        />

        {/* Video Viewfinder */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute object-cover"
          style={{
            bottom: '32%',
            left: '62%',
            transform: 'translateX(-50%)',
            width: '27%',
            height: '27%',
            borderRadius: '50%',
            zIndex: 30
          }}
        />

        {/* Shutter Button (Invisible) */}
        <button
          onClick={capturePhoto}
          className="absolute bg-transparent border-0 outline-none hover:opacity-50 transition-opacity"
          style={{
            bottom: '40%',
            left: '18%',
            width: '11%',
            height: '11%',
            cursor: 'pointer',
            zIndex: 30
          }}
          aria-label="Take photo"
        />

        {/* Photo Ejection Container */}
        {currentPhoto && (
          <div
            className="absolute transition-transform duration-1000 ease-out pointer-events-none"
            style={{
              transform: `translateX(-50%) translateY(${isEjecting ? '-40%' : '0'})`,
              top: 0,
              left: '50%',
              width: '35%',
              height: '100%',
              zIndex: 10
            }}
          >
            <div
              data-photo
              className="absolute bottom-0 cursor-move pointer-events-auto"
              style={{
                width: '100%',
                left: currentPhoto.x ? `${currentPhoto.x}px` : '0',
                top: currentPhoto.y ? `${currentPhoto.y}px` : 'auto'
              }}
              onMouseDown={(e) => handlePhotoMouseDown(e, currentPhoto.id)}
            >
              <div className="bg-white p-2 shadow-xl" style={{ aspectRatio: '3/4' }}>
                <div className="relative w-full h-4/5 bg-gray-100 overflow-hidden">
                  <img
                    src={currentPhoto.imageData}
                    alt="Developing"
                    className={`w-full h-full object-cover transition-all duration-3000 ${
                      currentPhoto.isDeveloping ? 'blur-xl opacity-30' : 'blur-0 opacity-100'
                    }`}
                    style={{
                      transition: currentPhoto.isDeveloping ? 'none' : 'filter 3s ease-in-out, opacity 3s ease-in-out'
                    }}
                  />
                </div>
                <p className="text-center text-xs mt-1 font-handwritten text-gray-800">
                  {currentPhoto.blessing}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
