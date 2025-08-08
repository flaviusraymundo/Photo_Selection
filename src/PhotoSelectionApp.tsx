import React, { useState, useRef, useEffect, useMemo } from "react";
import { Upload } from "lucide-react";

/**
 * PhotoSelectionApp – versão estável 🟢
 *
 * • Upload de até 88 fotos (embaralhadas).
 * • Classificação positiva/negativa/neutra com atalhos (+, -, qualquer).
 * • Seleção de 7 fotos mais impactantes.
 * • Arranjo em 12 slots (3×4) com drag-and-drop.
 * • Relatório final editável e exportação em PDF via jsPDF.
 *
 * Dependência extra:  npm i jspdf
 */

export default function PhotoSelectionApp() {
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState([]);            // { id, file, url, status }
  const [currentIdx, setCurrentIdx] = useState(0);
  const [chosen, setChosen] = useState([]);            // ids das 7
  const [photoPositions, setPhotoPositions] = useState({}); // { id: { x, y } }
  const [descriptions, setDescriptions] = useState({}); // { id: texto }
  const [exporting, setExporting] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null); // para modal de preview
  const [draggedPhoto, setDraggedPhoto] = useState(null); // foto sendo arrastada
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 }); // offset do mouse
  const fileInputRef = useRef();
  const arrangeAreaRef = useRef();

  /*************** helpers ***************/
  const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);
  const getPhoto = (id) => photos.find((p) => p.id === id);

  /*************** upload ***************/
  const handleFiles = (files) => {
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
  const classify = (status) => {
    setPhotos((prev) => {
      const clone = [...prev];
      clone[currentIdx].status = status;
      return clone;
    });
    
    if (currentIdx + 1 < photos.length) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setStep(2);
    }
  };

  // atalhos de teclado
  useEffect(() => {
    const h = (e) => {
      if (step !== 1) return;
      e.preventDefault(); // Previne comportamentos padrão
      if (["+", "="].includes(e.key)) classify("positive");
      else if (["-", "_"].includes(e.key)) classify("negative");
      else if (e.key === "ArrowLeft") setCurrentIdx((i) => (i > 0 ? i - 1 : 0));
      else if (e.key === " " || e.key === "Enter" || e.key === "Escape") classify("neutral");
      // Outras teclas não fazem nada (não classificam automaticamente)
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [step, currentIdx, photos.length]);

  /*************** seleção ***************/
  const toggleChosen = (id) => {
    setChosen((prev) => 
      prev.includes(id) 
        ? prev.filter((x) => x !== id)
        : prev.length === 7 
          ? prev 
          : [...prev, id]
    );
  };

  /*************** free drag-and-drop ***************/
  const handleMouseDown = (e, photoId) => {
    e.preventDefault();
    const rect = arrangeAreaRef.current.getBoundingClientRect();
    const photoElement = e.currentTarget;
    const photoRect = photoElement.getBoundingClientRect();
    
    setDraggedPhoto(photoId);
    setDragOffset({
      x: e.clientX - photoRect.left,
      y: e.clientY - photoRect.top
    });
  };

  const handleMouseMove = (e) => {
    if (!draggedPhoto || !arrangeAreaRef.current) return;
    
    const rect = arrangeAreaRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;
    
    // Limitar dentro da área
    const maxX = rect.width - 200; // largura da foto
    const maxY = rect.height - 150; // altura da foto
    
    setPhotoPositions(prev => ({
      ...prev,
      [draggedPhoto]: {
        x: Math.max(0, Math.min(x, maxX)),
        y: Math.max(0, Math.min(y, maxY))
      }
    }));
  };

  const handleMouseUp = () => {
    setDraggedPhoto(null);
    setDragOffset({ x: 0, y: 0 });
  };

  // Event listeners para mouse
  useEffect(() => {
    if (draggedPhoto) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedPhoto, dragOffset]);

  // Inicializar posições das fotos quando entrar na etapa 3
  useEffect(() => {
    if (step === 3 && chosen.length > 0) {
      setPhotoPositions(prev => {
        const newPositions = { ...prev };
        chosen.forEach((id, index) => {
          if (!newPositions[id]) {
            // Distribuir em grid inicial
            const cols = 3;
            const row = Math.floor(index / cols);
            const col = index % cols;
            newPositions[id] = {
              x: col * 220 + 50,
              y: row * 170 + 50
            };
          }
        });
        return newPositions;
      });
    }
  }, [step, chosen]);

  /*************** relatório ***************/
  const finalList = useMemo(() => {
    return chosen.map(getPhoto).filter(Boolean);
  }, [chosen, photos]);

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
      {step === 0 && (
        <UploadStep 
          handleFiles={handleFiles} 
          fileInputRef={fileInputRef}
        />
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
          proceed={() => {
            setStep(3);
          }}
          previewPhoto={previewPhoto}
          setPreviewPhoto={setPreviewPhoto}
        />
      )}

      {step === 3 && (
        <ArrangeStep
          chosen={chosen}
          photoPositions={photoPositions}
          getPhoto={getPhoto}
          handleMouseDown={handleMouseDown}
          draggedPhoto={draggedPhoto}
          arrangeAreaRef={arrangeAreaRef}
          finish={() => setStep(4)}
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

function UploadStep({ handleFiles, fileInputRef }) {
  return (
    <div className="text-center space-y-6 max-w-md mx-auto">
      <h1 className="text-3xl font-bold text-gray-800">Seleção de Fotos</h1>
      <p className="text-gray-600">
        Faça upload de até 88 fotos para classificação e seleção
      </p>
      <div
        className="bg-white p-8 rounded-xl shadow-lg border-2 border-dashed border-gray-300 hover:border-blue-400 cursor-pointer transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-16 h-16 text-blue-500 mx-auto mb-4" />
        <p className="text-lg font-medium mb-2">Clique para selecionar fotos</p>
        <p className="text-sm text-gray-500">
          Ou arraste e solte suas imagens aqui
        </p>
        <input
          type="file"
          accept="image/*"
          multiple
          ref={fileInputRef}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </div>
    </div>
  );
}

function ClassificationStep({ photo, idx, total, classify, goBack }) {
  return (
    <div className="w-full max-w-2xl text-center space-y-4">
      <h2 className="font-medium">Foto {idx + 1} / {total}</h2>
      <div className="h-[600px] flex items-center justify-center">
        <img
          src={photo.url}
          alt="preview"
          className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
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

function SelectionStep({ photos, chosen, toggleChosen, proceed, previewPhoto, setPreviewPhoto }) {
  return (
    <>
      <div className="w-full max-w-5xl">
        <h2 className="text-xl font-semibold mb-4 text-center">
          2. Selecione até 7 fotos mais impactantes ({chosen.length}/7 selecionadas)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {photos.map((p) => (
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

function ArrangeStep({ chosen, photoPositions, getPhoto, handleMouseDown, draggedPhoto, arrangeAreaRef, finish }) {
  return (
    <div className="w-full max-w-6xl mx-auto text-center">
      <h2 className="text-xl font-semibold mb-4">
        3. Organize as fotos selecionadas livremente (arraste para posicionar)
      </h2>
      
      <div 
        ref={arrangeAreaRef}
        className="relative w-full h-[600px] bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg mb-6 overflow-hidden"
        style={{ userSelect: 'none' }}
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
              onMouseDown={(e) => handleMouseDown(e, id)}
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
            // Reset para posições em grid
            const newPositions = {};
            chosen.forEach((id, index) => {
              const cols = 3;
              const row = Math.floor(index / cols);
              const col = index % cols;
              newPositions[id] = {
                x: col * 220 + 50,
                y: row * 170 + 50
              };
            });
            // Atualizar posições via callback do pai
            Object.entries(newPositions).forEach(([id, pos]) => {
              photoPositions[id] = pos;
            });
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

function ReportStep({ finalList, descriptions, setDescriptions, exporting, setExporting }) {
  const handleChange = (id, val) => {
    setDescriptions((prev) => ({ ...prev, [id]: val }));
  };

  // --- AUTO-PREENCHIMENTO ----------------------------------------------
  useEffect(() => {
    if (!finalList.length) return;
    
    // Carregar descrições do arquivo JSON
    const loadDescriptions = async () => {
      try {
        console.log('🔄 Carregando descrições...');
        const response = await fetch('/photoDescriptions.json');
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const flowerData = await response.json();
        console.log('✅ JSON carregado com sucesso!');
        
        console.log(`📊 Total de essências no JSON: ${Object.keys(flowerData).length}`);
        
        // Debug: mostrar as chaves do JSON
        const keys = Object.keys(flowerData);
        console.log('🔑 Primeiras 10 chaves:');
        keys.slice(0, 10).forEach((key, index) => {
          console.log(`  ${index + 1}. "${key}" → "${flowerData[key].title}"`);
        });
        
        setDescriptions(prev => {
          const next = { ...prev };
          
          finalList.forEach(photo => {
            // Só preenche se não tem descrição ainda
            if (!next[photo.id]) {
              const fileName = photo.file?.name?.toLowerCase() || '';
              const fileNameClean = fileName.replace(/\.[^/.]+$/, ''); // remove extensão
              
              console.log(`\n🔍 Processando: "${fileName}"`);
              
              // Sistema de matching melhorado
              let bestMatch = null;
              let bestScore = 0;
              let bestKey = null;
              
              // Normalizar nome do arquivo
              const normalizedFileName = fileNameClean.toLowerCase().trim();
              
              Object.entries(flowerData).forEach(([key, flower]) => {
                const keyForMatch = key.toLowerCase().trim();
                const titleForMatch = flower.title?.toLowerCase().trim() || '';
                
                let score = 0;
                
                // 1. Match exato com chave
                if (normalizedFileName === keyForMatch) {
                  score = 1000;
                }
                // 2. Match exato com título
                else if (normalizedFileName === titleForMatch) {
                  score = 950;
                }
                // 3. Arquivo contém a chave
                else if (normalizedFileName.includes(keyForMatch)) {
                  score = 500;
                }
                // 4. Arquivo contém o título
                else if (normalizedFileName.includes(titleForMatch)) {
                  score = 450;
                }
                // 5. Chave contém o arquivo
                else if (keyForMatch.includes(normalizedFileName)) {
                  score = 300;
                }
                // 6. Título contém o arquivo
                else if (titleForMatch.includes(normalizedFileName)) {
                  score = 250;
                }
                // 7. Match com espaços/underscores ignorados
                else {
                  const fileNormalized = normalizedFileName.replace(/[-_\s]+/g, '');
                  const keyNormalized = keyForMatch.replace(/[-_\s]+/g, '');
                  const titleNormalized = titleForMatch.replace(/[-_\s]+/g, '');
                  
                  if (fileNormalized === keyNormalized) {
                    score = 800;
                  } else if (fileNormalized === titleNormalized) {
                    score = 750;
                  } else if (fileNormalized.includes(keyNormalized)) {
                    score = 400;
                  } else if (fileNormalized.includes(titleNormalized)) {
                    score = 350;
                  } else if (keyNormalized.includes(fileNormalized)) {
                    score = 200;
                  } else if (titleNormalized.includes(fileNormalized)) {
                    score = 150;
                  }
                }
                
                if (score > bestScore) {
                  bestScore = score;
                  bestMatch = flower;
                  bestKey = key;
                }
              });
              
              // Threshold baixo para matching flexível
              if (bestMatch && bestScore >= 200) {
                next[photo.id] = `${bestMatch.title}\n\n${bestMatch.description}`;
                console.log(`✅ MATCH ENCONTRADO: "${fileName}" → "${bestKey}" (score: ${bestScore})`);
              } else {
                console.log(`❌ SEM MATCH: "${fileName}" (melhor tentativa: "${bestKey}" com score ${bestScore})`);
              }
            }
          });
          
          // Lista final de fotos sem descrição
          const photosWithoutDescription = finalList.filter(photo => !next[photo.id]);
          if (photosWithoutDescription.length > 0) {
            console.log('\n📋 FOTOS SEM DESCRIÇÃO:');
            photosWithoutDescription.forEach((photo, index) => {
              console.log(`${index + 1}. ${photo.file?.name || 'Sem nome'}`);
            });
          } else {
            console.log('🎉 Todas as fotos têm descrição!');
          }
          
          return next;
        });
      } catch (error) {
        console.error('❌ Erro ao carregar descrições:', error);
        console.log('🔧 Verifique se o arquivo public/photoDescriptions.json existe e tem JSON válido');
      }
    };

    loadDescriptions();
  }, [finalList]);
  // ----------------------------------------------------------------------


  const exportPDF = async () => {
    setExporting(true);
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
    const margin = 40;
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    const thumb = 72;         // 1 polegada
    const lineH = 14;
    let y = margin;

    // converter arquivo para dataURL
    const fileToDataURL = (file) =>
      new Promise((res) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result);
        reader.readAsDataURL(file);
      });

    for (let i = 0; i < finalList.length; i++) {
      const p   = finalList[i];
      const name = p.file?.name?.replace(/\.[^/.]+$/, "") || `Foto ${i + 1}`;
      const statusTxt = p.status === "positive" ? "Positiva" : "Negativa";
      const desc = descriptions[p.id] || "";

      const maxW = pageW - margin*2 - thumb - 10;
      const wrapped = pdf.splitTextToSize(desc, maxW);
      const blockH = Math.max(thumb, (2 + wrapped.length) * lineH);

      if (y + blockH > pageH - margin) {
        pdf.addPage(); y = margin;
      }

      try {
        const dataURL = await fileToDataURL(p.file);
        pdf.addImage(dataURL, "JPEG", margin, y, thumb, thumb);
      } catch {}

      pdf.setFontSize(12).setTextColor("#000");
      pdf.text(`${i + 1}. ${name}`, margin + thumb + 10, y + lineH);

      pdf.setFontSize(10)
         .setTextColor(p.status === "positive" ? "#22c55e" : "#ef4444")
         .text(statusTxt, margin + thumb + 10, y + lineH*2);

      pdf.setTextColor("#000").text(wrapped, margin + thumb + 10, y + lineH*3);

      y += blockH + 20;
    }

    pdf.save("selecao.pdf");
    setExporting(false);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold mb-6 text-center">
        4. Relatório Final
      </h2>
      <div className="space-y-6">
        {finalList.map((p, i) => (
          <div
            key={p.id}
            className="flex flex-col sm:flex-row items-center gap-4 bg-white shadow rounded-lg p-4"
          >
            <img
              src={URL.createObjectURL(p.file)}
              alt={`sel_${i}`}
              className="h-24 w-24 object-cover rounded-lg border"
            />
            <div className="flex-1 w-full">
              <h3 className="font-medium text-lg truncate mb-2">
                {p.file?.name?.replace(/\.[^/.]+$/, "") || `Foto ${i + 1}`}
              </h3>
              <textarea
                rows="2"
                placeholder="Digite características/descrição..."
                value={descriptions[p.id] || ""}
                onChange={(e) => handleChange(p.id, e.target.value)}
                className="w-full p-2 border rounded-md resize-none"
              />
            </div>
          </div>
        ))}
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