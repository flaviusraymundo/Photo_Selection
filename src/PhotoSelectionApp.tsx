import React, { useState, useRef, useEffect, useMemo } from "react";
// import { Upload } from "lucide-react"; // (opcional) não é usado no momento

/**
 * PhotoSelectionApp – versão estável 🟢 (Pointer Events)
 *
 * • Upload de até 88 fotos (embaralhadas).
 * • Classificação positiva/negativa/neutra com atalhos (+, -, qualquer).
 * • Seleção de 7 fotos mais impactantes.
 * • Organização LIVRE com drag baseado em Pointer Events (mobile/desktop).
 * • Relatório final editável e exportação em PDF via jsPDF.
 *
 * Dependência extra:  npm i jspdf   (se estiver usando CI/host, ele instala no build)
 */

export default function PhotoSelectionApp() {
  const [step, setStep] = useState(-1); // -1 = welcome, 0 = loading, 1 = classification
  const [photos, setPhotos] = useState<any[]>([]);            // { id, file, url, status }
  const [currentIdx, setCurrentIdx] = useState(0);
  const [chosen, setChosen] = useState<string[]>([]);         // ids das 7
  const [photoPositions, setPhotoPositions] = useState<Record<string, {x:number,y:number}>>({}); // { id: { x, y } }
  const [descriptions, setDescriptions] = useState<Record<string, string>>({}); // { id: texto }
  const [exporting, setExporting] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<any>(null); // para modal de preview

  // ---- NOVO: estado para drag com Pointer Events ----
  const [draggedPhoto, setDraggedPhoto] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{x:number,y:number}>({ x: 0, y: 0 });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const arrangeAreaRef = useRef<HTMLDivElement | null>(null);

  // Lista das 88 fotos na pasta sample-photos
  const samplePhotoNames = [
    "Anticeptic Bush.jpg", "Balga Blackboy.jpg", "Black Kangaroo Paw.jpg", "Blue China Orchid.jpg",
    "Blue Leschenaultia.jpg", "Brachycome.jpg", "Brown Boronia.jpg", "Candle of Life.jpg",
    "Cape Bluebell.jpg", "Catspaw.jpg", "Christmas Tree.jpg", "Correa.jpg", "Cowkicks.jpg",
    "Cowslip Orchid.jpg", "Dampiera.jpg", "Donkey Orchid.jpg", "Fringed Lily Twiner.jpg",
    "Fringed Mantis Orchid.jpg", "Fuchsia Grevillea.jpg", "Fuschia Gum.jpg", "Geraldton Wax.jpg",
    "Giving Hands.jpg", "Goddess Grasstree.jpg", "Golden Glory.jpg", "Golden Waitsia.jpg",
    "Green Rose.jpg", "Hairy Yellow Pea.jpg", "Happy Wanderer.jpg", "Hops Bush.jpg",
    "Hybrid Pink Fairy Cowslip Orchid.jpg", "Illyarrie.jpg", "Leafless Orchid.jpg", "Macrozamia.jpg",
    "Many Headed Dryandra.jpg", "Mauve Melaleuca.jpg", "Menzies Banksia.jpg", "One Sided Bottlebrush.jpg",
    "Orange Leschenaultia.jpg", "Orange Spiked Pea.jpg", "Pale Sundew.jpg", "Parakeelya.jpg",
    "Pincushion Hakea.jpg", "Pink Everlasting.jpg", "Pink Fairy Orchid.jpg", "Pink Fountain Triggerplant.jpg",
    "Pink Impatiens.jpg", "Pink Trumpet Flower.jpg", "Pixie Mops.jpg", "Purple and Red Kangaroo Paw.jpg",
    "Purple Enamel Orchid.jpg", "Purple Eremophila.jpg", "Purple Flag Flower.jpg", "Purple Nymph Waterlily.jpg",
    "Queensland Bottlebrush.jpg", "Rabbit Orchid.jpg", "Red and Green Kangaroo Paw.jpg", "Red Beak Orchid.jpg",
    "Red Feather Flower.jpg", "Red Leschenaultia.jpg", "Reed Triggerplant.jpg", "Ribbon Pea.jpg",
    "Rose Cone Flower.jpg", "Shy Blue Orchid.jpg", "Silver Princess.jpg", "Snake Bush.jpg",
    "Snake Vine.jpg", "Southern Cross.jpg", "Spirit Faces.jpg", "Star of Bethlehem.jpg",
    "Starts Spider Orchid.jpg", "Swan River Myrtle.jpg", "Urchin Dryandra.jpg", "Ursinia.jpg",
    "Veronica.jpg", "Violet Butterfly.jpg", "WA Smokebush.jpg", "Wattle.jpg", "White Eremophila.jpg",
    "White Nymph Waterlily.jpg", "White Spider Orchid.jpg", "Wild Violet.jpg", "Wooly Banksia.jpg",
    "Wooly Smokebush.jpg", "Yellow and Green Kangaroo Paw .jpg", "Yellow Boronia.jpg", "Yellow Cone Flower.jpg",
    "Yellow Flag Flower.jpg", "Yellow Leschenaultia.jpg"
  ];

  // Carregar fotos automaticamente na inicialização
  useEffect(() => {
    const loadSamplePhotos = () => {
      const getBasePath = () => {
        const hostname = window.location.hostname;
        if (hostname.includes('github.io')) return '/Photo_Selection';
        return '';
      };
      const basePath = getBasePath();

      const mockPhotos = samplePhotoNames.map((fileName, i) => ({
        id: `sample_${i}`,
        file: { name: fileName },
        url: `${basePath}/sample-photos/${fileName}`,
        status: "neutral",
      }));
      setPhotos(shuffle(mockPhotos));
      setStep(1); // Pula direto para a classificação
    };

    if (step === 0) {
      // pequeno delay p/ mostrar loading
      setTimeout(loadSamplePhotos, 1000);
    }
  }, [step]);

  // Atalho Enter na tela de boas-vindas
  useEffect(() => {
    const handleWelcomeKeyPress = (e: KeyboardEvent) => {
      if (step === -1 && e.key === 'Enter') setStep(0);
    };
    if (step === -1) {
      window.addEventListener('keydown', handleWelcomeKeyPress);
      return () => window.removeEventListener('keydown', handleWelcomeKeyPress);
    }
  }, [step]);

  /*************** helpers ***************/
  const shuffle = (arr: any[]) => arr.sort(() => Math.random() - 0.5);
  const getPhoto = (id: string) => photos.find((p) => p.id === id);

  /*************** upload ***************/
  const handleFiles = (files: FileList) => {
    const arr = Array.from(files).slice(0, 88);
    const mapped = arr.map((f, i) => ({
      id: `${Date.now()}_${i}`,
      file: f,
      url: URL.createObjectURL(f),
      status: "neutral",
    }));
    setPhotos(shuffle(mapped));
    setStep(1);
  };

  /*************** classificação ***************/
  const classify = (status: "positive" | "negative" | "neutral") => {
    setPhotos((prev) => {
      const clone = [...prev];
      clone[currentIdx].status = status;
      return clone;
    });

    if (currentIdx + 1 < photos.length) setCurrentIdx(currentIdx + 1);
    else setStep(2);
  };

  // atalhos de teclado
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (step !== 1) return;
      e.preventDefault();
      if (["+", "="].includes(e.key)) classify("positive");
      else if (["-", "_"].includes(e.key)) classify("negative");
      else if (e.key === "ArrowLeft") setCurrentIdx((i) => (i > 0 ? i - 1 : 0));
      else if (e.key === " " || e.key === "Enter" || e.key === "Escape") classify("neutral");
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [step, currentIdx, photos.length]);

  /*************** seleção ***************/
  const toggleChosen = (id: string) => {
    setChosen((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length === 7
        ? prev
        : [...prev, id]
    );
  };

  /*************** Organização livre – POINTER EVENTS ***************/
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, photoId: string) => {
    e.preventDefault();
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();

    setDraggedPhoto(photoId);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });

    try { el.setPointerCapture(e.pointerId); } catch {}
  };

  const moveTo = (clientX: number, clientY: number) => {
    if (!draggedPhoto || !arrangeAreaRef.current) return;

    const rect = arrangeAreaRef.current.getBoundingClientRect();
    const x = clientX - rect.left - dragOffset.x;
    const y = clientY - rect.top - dragOffset.y;

    // limitar dentro da área (w-48=192px, h-36=144px)
    const maxX = rect.width - 192;
    const maxY = rect.height - 144;

    setPhotoPositions(prev => ({
      ...prev,
      [draggedPhoto]: {
        x: Math.max(0, Math.min(x, maxX)),
        y: Math.max(0, Math.min(y, maxY))
      }
    }));
  };

  const handlePointerMoveDoc = (e: PointerEvent) => {
    if (!draggedPhoto) return;
    e.preventDefault(); // impede scroll no mobile durante o drag
    moveTo(e.clientX, e.clientY);
  };

  const handlePointerUpDoc = () => {
    if (!draggedPhoto) return;
    setDraggedPhoto(null);
    setDragOffset({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (!draggedPhoto) return;

    const move = (ev: Event) => handlePointerMoveDoc(ev as PointerEvent);
    const up = () => handlePointerUpDoc();

    document.addEventListener('pointermove', move, { passive: false });
    document.addEventListener('pointerup', up, { passive: false });

    return () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
    };
  }, [draggedPhoto, dragOffset]);

  // Inicializar posições das fotos quando entrar na etapa 3
  useEffect(() => {
    if (step === 3 && chosen.length > 0) {
      setPhotoPositions(prev => {
        const newPositions = { ...prev };
        chosen.forEach((id, index) => {
          if (!newPositions[id]) {
            const cols = 3;
            const row = Math.floor(index / cols);
            const col = index % cols;
            newPositions[id] = {
              x: col * 220 + 50,
              y: row * 160 + 50
            };
          }
        });
        return newPositions;
      });
    }
  }, [step, chosen]);

  /*************** relatório ***************/
  const finalList = useMemo(() => {
    const photosWithPositions = chosen.map(id => {
      const photo = getPhoto(id);
      const position = photoPositions[id] || { x: 0, y: 0 };
      return { photo, position, id };
    }).filter(item => item.photo);

    photosWithPositions.sort((a, b) => {
      if (Math.abs(a.position.y - b.position.y) < 50) {
        return a.position.x - b.position.x;
      }
      return a.position.y - b.position.y;
    });

    return photosWithPositions.map(item => item.photo);
  }, [chosen, photos, photoPositions]);

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
      {step === -1 && (
        <WelcomeStep startProcess={() => setStep(0)} />
      )}

      {step === 0 && (
        <UploadStep handleFiles={handleFiles} fileInputRef={fileInputRef} />
      )}

      {step === 1 && photos.length > 0 && (
        <ClassificationStep
          photo={photos[currentIdx]}
          idx={currentIdx}
          total={photos.length}
          classify={classify}
          goBack={() => setCurrentIdx((i) => (i > 0 ? i - 1 : 0))}
        />
      )}

      {step === 2 && (
        <SelectionStep
          photos={photos.filter((p) => p.status !== "neutral")}
          chosen={chosen}
          toggleChosen={toggleChosen}
          proceed={() => setStep(3)}
          previewPhoto={previewPhoto}
          setPreviewPhoto={setPreviewPhoto}
        />
      )}

      {step === 3 && (
        <ArrangeStep
          chosen={chosen}
          photoPositions={photoPositions}
          getPhoto={getPhoto}
          handlePointerDown={handlePointerDown}
          draggedPhoto={draggedPhoto}
          arrangeAreaRef={arrangeAreaRef}
          finish={() => setStep(4)}
          setPhotoPositions={setPhotoPositions} // << agora passamos por props
        />
      )}

      {step === 4 && (
        <ReportStep
          finalList={finalList}
          descriptions={descriptions}
          setDescriptions={setDescriptions}
          exporting={exporting}
          setExporting={setExporting}
        />
      )}
    </div>
  );
}

/* ---------- componentes ---------- */

function WelcomeStep({ startProcess }: { startProcess: () => void }) {
  const getBasePath = () => {
    const hostname = window.location.hostname;
    if (hostname.includes('github.io')) return '/Photo_Selection';
    return '';
  };
  const basePath = getBasePath();

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-8 max-w-lg mx-auto">
        <div className="flex justify-center mb-6">
          <img
            src={`${basePath}/Logo 111.png`}
            alt="Logo"
            className="h-72 w-auto object-contain"
            draggable={false}
          />
        </div>

        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-gray-800 mb-2">
            Diagnóstico Avançado em Terapia Vibracional
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed">
            Por Flavius Raymundo
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={startProcess}
            className="px-12 py-4 bg-blue-600 text-white text-xl font-semibold rounded-xl hover:bg-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Iniciar
          </button>

          <p className="text-sm text-gray-500">
            Pressione <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">Enter</kbd> ou clique no botão
          </p>
        </div>

        <div className="text-left bg-white p-6 rounded-lg shadow-sm border text-sm text-gray-600 space-y-2">
          <h3 className="font-semibold text-gray-800 mb-3">Como funciona:</h3>
          <div className="space-y-1">
            <p>• <strong>Etapa 1:</strong> Relembrando a situação/problema: classificar as 88 fotos em (Positivas, Negativas ou Neutras)</p>
            <p>• <strong>Etapa 2:</strong> Selecionar as fotos mais impactantes</p>
            <p>• <strong>Etapa 3:</strong> Interpretação do Diagnóstico</p>
            <p>• <strong>Etapa 4:</strong> Gerar relatório em PDF</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadStep({ handleFiles, fileInputRef }: { handleFiles: (f: FileList) => void, fileInputRef: React.RefObject<HTMLInputElement> }) {
  return (
    <div className="text-center space-y-6 max-w-md mx-auto">
      <h1 className="text-3xl font-bold text-gray-800">Carregando Fotos...</h1>
      <p className="text-gray-600">
        88 fotos de essências florais estão sendo carregadas automaticamente
      </p>
      <div className="bg-white p-8 rounded-xl shadow-lg">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-lg font-medium mb-2">Preparando classificação...</p>
      </div>
    </div>
  );
}

function ClassificationStep({
  photo, idx, total, classify, goBack
}: {
  photo: any, idx: number, total: number,
  classify: (s: "positive"|"negative"|"neutral") => void,
  goBack: () => void
}) {
  return (
    <div className="w-full max-w-2xl text-center space-y-4">
      <h2 className="font-medium">Foto {idx + 1} / {total}</h2>
      <div className="h-[600px] flex items-center justify-center">
        <img
          src={photo.url}
          alt="preview"
          className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
          draggable={false}
        />
      </div>
      <div className="flex justify-center gap-3">
        <button
          onClick={goBack}
          disabled={idx === 0}
          className={`px-4 py-2 rounded-xl bg-gray-300 hover:bg-gray-400 ${
            idx === 0 ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          ← Anterior
        </button>
        <button
          onClick={() => classify("positive")}
          className="px-6 py-2 rounded-xl bg-green-500 text-white hover:bg-green-600"
        >
          Positiva (+)
        </button>
        <button
          onClick={() => classify("negative")}
          className="px-6 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600"
        >
          Negativa (-)
        </button>
        <button
          onClick={() => classify("neutral")}
          className="px-6 py-2 rounded-xl bg-gray-300 hover:bg-gray-400"
        >
          Neutra
        </button>
      </div>
      <p className="text-sm text-gray-500">
        Use ← para voltar. Atalhos: +/=: positiva, -/_: negativa, Enter ou barra de espaço: neutra.
      </p>
    </div>
  );
}

function SelectionStep({
  photos, chosen, toggleChosen, proceed, previewPhoto, setPreviewPhoto
}: any) {
  return (
    <>
      <div className="w-full max-w-5xl">
        <h2 className="text-xl font-semibold mb-4 text-center">
          2. Selecione até 7 fotos mais impactantes ({chosen.length}/7 selecionadas)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {photos.map((p: any) => (
            <div
              key={p.id}
              className={`relative rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow ${
                chosen.includes(p.id) ? "ring-4 ring-blue-500" : ""
              }`}
            >
              <img
                src={p.url}
                alt="option"
                className="h-48 w-full object-contain bg-gray-50 cursor-pointer"
                onClick={() => setPreviewPhoto(p)}
                draggable={false}
              />
              <span className={`absolute top-2 left-2 px-2 py-1 text-xs rounded font-medium text-white ${
                p.status === "positive" ? "bg-green-500" : "bg-red-500"
              }`}>
                {p.status === "positive" ? "+" : "-"}
              </span>
              {chosen.includes(p.id) && (
                <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                  <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                    {chosen.indexOf(p.id) + 1}
                  </div>
                </div>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleChosen(p.id);
                }}
                className={`absolute bottom-2 right-2 w-8 h-8 rounded-full text-white font-bold text-lg shadow-lg transition-colors ${
                  chosen.includes(p.id)
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-green-500 hover:bg-green-600"
                }`}
              >
                {chosen.includes(p.id) ? "−" : "+"}
              </button>
            </div>
          ))}
        </div>
        <div className="text-center mt-6">
          <button
            disabled={chosen.length === 0}
            onClick={proceed}
            className={`px-8 py-3 rounded-xl text-white font-medium transition-colors ${
              chosen.length > 0
                ? "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            Continuar para Organização
          </button>
        </div>
      </div>

      {/* Modal de Preview */}
      {previewPhoto && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={previewPhoto.url}
              alt="preview"
              className="max-h-[90vh] max-w-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
              draggable={false}
            />
            <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg">
              <div className="font-medium">{previewPhoto.file?.name || 'Foto'}</div>
              <div className="text-sm opacity-80">
                {previewPhoto.status === 'positive' ? 'Positiva' : 'Negativa'}
                {chosen.includes(previewPhoto.id) && ` • Selecionada (${chosen.indexOf(previewPhoto.id) + 1}/${chosen.length})`}
              </div>
            </div>
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-4 right-4 bg-black/70 text-white w-10 h-10 rounded-full hover:bg-black/90 transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function ArrangeStep({
  chosen,
  photoPositions,
  getPhoto,
  handlePointerDown,
  draggedPhoto,
  arrangeAreaRef,
  finish,
  setPhotoPositions
}: {
  chosen: string[];
  photoPositions: Record<string,{x:number,y:number}>;
  getPhoto: (id:string)=>any;
  handlePointerDown: (e: React.PointerEvent<HTMLDivElement>, id: string) => void;
  draggedPhoto: string | null;
  arrangeAreaRef: React.RefObject<HTMLDivElement>;
  finish: () => void;
  setPhotoPositions: React.Dispatch<React.SetStateAction<Record<string,{x:number,y:number}>>>;
}) {
  return (
    <div className="w-full max-w-6xl mx-auto text-center">
      <h2 className="text-xl font-semibold mb-4">
        3. Organize as fotos selecionadas livremente (arraste para posicionar)
      </h2>

      <div
        ref={arrangeAreaRef}
        className="relative w-full h-[800px] bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg mb-6 overflow-hidden"
        style={{ userSelect: 'none', touchAction: 'none' }}
      >
        <div className="absolute top-4 left-4 text-sm text-gray-500 pointer-events-none">
          Arraste as fotos para organizá-las livremente
        </div>

        {chosen.map((id) => {
          const photo = getPhoto(id);
          const position = photoPositions[id] || { x: 0, y: 0 };
          const isDragging = draggedPhoto === id;

          return (
            <div
              key={id}
              onPointerDown={(e) => handlePointerDown(e, id)}
              className={`absolute w-48 h-36 rounded-lg overflow-hidden shadow-lg cursor-move transition-transform hover:scale-105 ${
                isDragging ? 'z-50 scale-110 shadow-2xl' : 'z-10'
              }`}
              style={{
                left: position.x,
                top: position.y,
                transform: isDragging ? 'rotate(5deg)' : 'rotate(0deg)'
              }}
            >
              {photo && (
                <>
                  <img
                    src={photo.url}
                    alt="arranged"
                    className="w-full h-full object-cover pointer-events-none"
                    draggable={false}
                  />
                  <div className="absolute top-2 left-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                    {chosen.indexOf(id) + 1}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 text-xs truncate">
                    {photo.file?.name?.replace(/\.[^/.]+$/, "") || `Foto ${chosen.indexOf(id) + 1}`}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-center gap-4">
        <button
          onClick={() => {
            const newPositions: Record<string,{x:number,y:number}> = {};
            chosen.forEach((id, index) => {
              const cols = 3;
              const row = Math.floor(index / cols);
              const col = index % cols;
              newPositions[id] = { x: col * 220 + 50, y: row * 160 + 50 };
            });
            setPhotoPositions(prev => ({ ...prev, ...newPositions }));
          }}
          className="px-4 py-2 rounded-xl bg-gray-500 text-white hover:bg-gray-600 transition-colors"
        >
          Resetar Posições
        </button>
        <button
          onClick={finish}
          className="px-6 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
        >
          Gerar Relatório
        </button>
      </div>
    </div>
  );
}

function ReportStep({
  finalList, descriptions, setDescriptions, exporting, setExporting
}: any) {
  const [additionalInfo, setAdditionalInfo] = useState('Cliente:\n\nDosagem:\n\nNotas:\n');

  const handleChange = (id: string, val: string) => {
    setDescriptions((prev: Record<string,string>) => ({ ...prev, [id]: val }));
  };

  // --- AUTO-PREENCHIMENTO ----------------------------------------------
  useEffect(() => {
    if (!finalList.length) return;

    const loadDescriptions = async () => {
      try {
        const getBasePath = () => {
          const hostname = window.location.hostname;
          if (hostname.includes('github.io')) return '/Photo_Selection';
          return '';
        };
        const basePath = getBasePath();

        const response = await fetch(`${basePath}/photoDescriptions.json`);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const flowerData = await response.json();

        setDescriptions((prev: Record<string,string>) => {
          const next = { ...prev };
          finalList.forEach((photo: any) => {
            if (!next[photo.id]) {
              const fileName = photo.file?.name?.toLowerCase() || '';
              const fileNameClean = fileName.replace(/\.[^/.]+$/, '');
              let bestMatch: any = null;
              let bestScore = 0;

              const normalizedFileName = fileNameClean.toLowerCase().trim();
              Object.entries(flowerData).forEach(([key, flower]: any) => {
                const keyForMatch = key.toLowerCase().trim();
                const titleForMatch = flower.title?.toLowerCase().trim() || '';
                let score = 0;

                if (normalizedFileName === keyForMatch) score = 1000;
                else if (normalizedFileName === titleForMatch) score = 950;
                else if (normalizedFileName.includes(keyForMatch)) score = 500;
                else if (normalizedFileName.includes(titleForMatch)) score = 450;
                else if (keyForMatch.includes(normalizedFileName)) score = 300;
                else if (titleForMatch.includes(normalizedFileName)) score = 250;
                else {
                  const fileNormalized = normalizedFileName.replace(/[-_\s]+/g, '');
                  const keyNormalized = keyForMatch.replace(/[-_\s]+/g, '');
                  const titleNormalized = titleForMatch.replace(/[-_\s]+/g, '');
                  if (fileNormalized === keyNormalized) score = 800;
                  else if (fileNormalized === titleNormalized) score = 750;
                  else if (fileNormalized.includes(keyNormalized)) score = 400;
                  else if (fileNormalized.includes(titleNormalized)) score = 350;
                  else if (keyNormalized.includes(fileNormalized)) score = 200;
                  else if (titleNormalized.includes(fileNormalized)) score = 150;
                }
                if (score > bestScore) { bestScore = score; bestMatch = flower; }
              });

              if (bestMatch && bestScore >= 200) {
                next[photo.id] = `${bestMatch.title}\n\n${bestMatch.description}`;
              }
            }
          });
          return next;
        });
      } catch (error) {
        console.error('❌ Erro ao carregar descrições:', error);
      }
    };

    loadDescriptions();
  }, [finalList, setDescriptions]);
  // ----------------------------------------------------------------------

  const exportPDF = async () => {
    setExporting(true);
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
    const margin = 40;
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    const getBasePath = () => {
      const hostname = window.location.hostname;
      if (hostname.includes('github.io')) return '/Photo_Selection';
      return '';
    };
    const basePath = getBasePath();

    const centerX = pageW / 2;
    let y = margin + 20;

    try {
      const logoResponse = await fetch(`${basePath}/Logo 111.png`);
      if (logoResponse.ok) {
        const logoBlob = await logoResponse.blob();
        const logoDataURL: any = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(logoBlob);
        });
        const logoWidth = 120;
        const logoHeight = 120;
        pdf.addImage(logoDataURL, "PNG", centerX - logoWidth/2, y, logoWidth, logoHeight);
        y += logoHeight + 30;
      }
    } catch {}

    pdf.setFontSize(24);
    pdf.setTextColor("#1f2937");
    pdf.text("Diagnóstico Avançado", centerX, y, { align: "center" });
    y += 30;

    pdf.text("em Terapia Vibracional", centerX, y, { align: "center" });
    y += 50;

    pdf.setFontSize(16);
    pdf.setTextColor("#6b7280");
    pdf.text("Por Flavius Raymundo", centerX, y, { align: "center" });
    y += 60;

    const currentDate = new Date().toLocaleDateString('pt-BR', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    pdf.setFontSize(12);
    pdf.text(`Relatório gerado em: ${currentDate}`, centerX, y, { align: "center" });
    y += 40;

    if (additionalInfo.trim()) {
      pdf.setFontSize(14);
      pdf.setTextColor("#1f2937");
      pdf.text("Informações Adicionais:", margin, y);
      y += 25;

      pdf.setFontSize(11);
      pdf.setTextColor("#374151");
      const additionalWrapped = pdf.splitTextToSize(additionalInfo, pageW - margin * 2);
      pdf.text(additionalWrapped, margin, y);
      y += additionalWrapped.length * 14 + 30;
    }

    pdf.setDrawColor("#e5e7eb");
    pdf.line(margin, y, pageW - margin, y);

    pdf.addPage();
    y = margin + 20;

    pdf.setFontSize(16);
    pdf.setTextColor("#1f2937");
    pdf.text("Essências Selecionadas", centerX, y, { align: "center" });
    y += 40;

    const thumb = 72;
    const lineH = 14;

    const urlToDataURL = (url: string) =>
      new Promise<string | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          const size = 300;
          canvas.width = size; canvas.height = size;
          const scale = Math.max(size / img.width, size / img.height);
          const scaledWidth = img.width * scale;
          const scaledHeight = img.height * scale;
          const x = (size - scaledWidth) / 2;
          const y = (size - scaledHeight) / 2;
          ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, size, size);
          ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
          resolve(canvas.toDataURL('image/jpeg'));
        };
        img.onerror = () => resolve(null);
        img.src = url;
      });

    for (let i = 0; i < finalList.length; i++) {
      const p   = finalList[i];
      const name = p.file?.name?.replace(/\.[^/.]+$/, "") || `Foto ${i + 1}`;
      const statusTxt = p.status === "positive" ? "Positiva" : "Negativa";
      const desc = descriptions[p.id] || "";

      const maxW = pageW - margin*2 - thumb - 10;

      const formattedDesc = desc
        .replace(/Dosagem Oral de Essências Florais \(para bem-estar mental\/emocional\)\s*/g, '')
        .replace(/Informações sobre como prescrever e preparar doses orais\.\s*/g, '')
        .replace(/\n\n/g, '\n \n')
        .replace(/Qualidades Positivas - Palavras-Chave:/g, '\nQualidades Positivas - Palavras-Chave:')
        .replace(/Problema Alvo - Palavras-Chave:/g, '\nProblema Alvo - Palavras-Chave:')
        .replace(/Natureza Curativa/g, '\nNatureza Curativa')
        .replace(/Qualidades Espirituais/g, '\nQualidades Espirituais')
        .replace(/Saúde Mental\/Emocional/g, '\nSaúde Mental/Emocional')
        .replace(/Dosagem Oral/g, '\nDosagem Oral')
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .trim();

      const wrapped = pdf.splitTextToSize(formattedDesc, maxW);
      const blockH = Math.max(thumb, (2 + wrapped.length) * lineH);

      if (y + blockH > pageH - margin) { pdf.addPage(); y = margin; }

      try {
        if (p.url) {
          const dataURL = await urlToDataURL(p.url);
          if (dataURL) pdf.addImage(dataURL, "JPEG", margin, y, thumb, thumb);
        }
      } catch {}

      pdf.setFontSize(12).setTextColor("#000");
      pdf.text(`${i + 1}. ${name}`, margin + thumb + 10, y + lineH);

      pdf.setFontSize(10)
         .setTextColor(p.status === "positive" ? "#22c55e" : "#ef4444")
         .text(statusTxt, margin + thumb + 10, y + lineH*2);

      pdf.setTextColor("#000").text(wrapped, margin + thumb + 10, y + lineH*3);

      y += blockH + 20;
    }

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `diagnostico-${new Date().toISOString().split('T')[0]}.pdf`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        window.open(pdfUrl, '_blank');
        document.body.removeChild(link);
        URL.revokeObjectURL(pdfUrl);
      }, 100);
    } else {
      pdf.save(`diagnostico-${new Date().toISOString().split('T')[0]}.pdf`);
    }

    setExporting(false);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold mb-6 text-center">
        4. Relatório Final
      </h2>
      <div className="space-y-6">
        {finalList.map((p: any, i: number) => (
          <div
            key={p.id}
            className="flex flex-col sm:flex-row items-center gap-4 bg-white shadow rounded-lg p-4"
          >
            <img
              src={p.url}
              alt={`sel_${i}`}
              className="h-24 w-24 object-cover rounded-lg border"
              draggable={false}
            />
            <div className="flex-1 w-full">
              <h3 className="font-medium text-lg truncate mb-2">
                {p.file?.name?.replace(/\.[^/.]+$/, "") || `Foto ${i + 1}`}
              </h3>
              <textarea
                rows={2}
                placeholder="Digite características/descrição..."
                value={descriptions[p.id] || ""}
                onChange={(e) => handleChange(p.id, e.target.value)}
                className="w-full p-2 border rounded-md resize-none"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          Informações Adicionais
        </h3>
        <p className="text-sm text-blue-700 mb-3">
          Este campo será incluído no cabeçalho do PDF. Use para adicionar informações sobre o cliente, contexto da consulta, observações gerais, etc.
        </p>
        <textarea
          rows={4}
          placeholder="Preencha as informações do paciente, dosagem recomendada e observações..."
          value={additionalInfo}
          onChange={(e) => setAdditionalInfo(e.target.value)}
          className="w-full p-3 border border-blue-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="text-center mt-6">
        <button
          onClick={exportPDF}
          disabled={exporting}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {exporting ? "Gerando PDF…" : "Exportar PDF"}
        </button>
      </div>
    </div>
  );
}