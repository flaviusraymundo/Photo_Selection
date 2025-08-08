import React, { useState, useRef, useEffect } from "react";
import { Upload } from "lucide-react";
import photoDescriptions from "./data/photoDescriptions.json";

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
  const [grid, setGrid]   = useState(Array(12).fill(null)); // 12 slots
  const [descriptions, setDescriptions] = useState({}); // { id: texto }
  const [exporting, setExporting] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null); // para modal de preview
  const fileInputRef = useRef();

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

  /*************** drag-and-drop ***************/
  const onDragStart = (e, from) => e.dataTransfer.setData("from", from);
  const onDrop = (e, to) => {
    const from = parseInt(e.dataTransfer.getData("from"));
    if (Number.isNaN(from) || from === to) return;
    setGrid((prev) => {
      const clone = [...prev];
      [clone[from], clone[to]] = [clone[to], clone[from]];
      return clone;
    });
  };

  /*************** relatório ***************/
  const finalList = grid.filter(Boolean).map(getPhoto);

  // Carrega descrições automáticas quando finalList muda
  useEffect(() => {
    const autoDescriptions = {};
    finalList.forEach(photo => {
      if (photo && photo.file) {
        // Remove extensão e normaliza o nome do arquivo para buscar no JSON
        const fileName = photo.file.name
          .replace(/\.[^/.]+$/, "") // remove extensão
          .toLowerCase()
          .trim();
        const description = photoDescriptions[fileName];
        if (description) {
          autoDescriptions[photo.id] = description;
        }
      }
    });

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
            const base = [...chosen, ...Array(20 - chosen.length).fill(null)];
            setGrid(base);
            setStep(3);
          }}
          previewPhoto={previewPhoto}
          setPreviewPhoto={setPreviewPhoto}
        />
      )}

      {step === 3 && (
        <ArrangeStep
          grid={grid}
          getPhoto={getPhoto}
          onDragStart={onDragStart}
          onDrop={onDrop}
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
          Neutra (qualquer)
        </button>
      </div>
      <p className="text-sm text-gray-500">
        Use ← para voltar. Atalhos: +/=: positiva, -/_: negativa, outra tecla: neutra.
      </p>
    </div>
  );
}

function SelectionStep({ photos, chosen, toggleChosen, proceed, previewPhoto, setPreviewPhoto }) {
  return (
    <>
      <div className="w-full max-w-5xl">
        <h2 className="text-xl font-semibold mb-4 text-center">
          2. Selecione as 7 fotos mais impactantes ({chosen.length}/7 selecionadas)
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
            disabled={chosen.length !== 7}
            onClick={proceed}
            className={`px-8 py-3 rounded-xl text-white font-medium transition-colors ${
              chosen.length === 7
                ? "bg-blue-600 hover:bg-blue-700 cursor-pointer" 
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            {chosen.length === 7 
              ? "Continuar para Organização" 
              : `Selecione ${7 - chosen.length} foto(s)`
            }
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
                {chosen.includes(previewPhoto.id) && ` • Selecionada (${chosen.indexOf(previewPhoto.id) + 1}/7)`}
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

function ArrangeStep({ grid, getPhoto, onDragStart, onDrop, finish }) {
  return (
    <div className="w-full max-w-6xl mx-auto text-center">
      <h2 className="text-xl font-semibold mb-4">
        3. Organize as fotos selecionadas (arraste para reordenar)
      </h2>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {grid.map((id, idx) => (
          <div
            key={idx}
            draggable={Boolean(id)}
            onDragStart={(e) => id && onDragStart(e, idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, idx)}
            className="aspect-[4/3] w-full h-64 rounded-lg flex items-center justify-center overflow-hidden bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            {id ? (
              <img
                src={getPhoto(id)?.url}
                alt="slot"
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              null
            )}
          </div>
        ))}
      </div>
      <button
        onClick={finish}
        className="px-6 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
      >
        Gerar Relatório
      </button>
    </div>
  );
}

function ReportStep({ finalList, descriptions, setDescriptions, exporting, setExporting }) {
  const handleChange = (id, val) => {
    setDescriptions((prev) => ({ ...prev, [id]: val }));
  };

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
                className="w-full border rounded-lg p-2 text-sm"
              />
            </div>
          </div>
        ))}
      </div>
      <div className="text-center mt-6">
        <button
          onClick={exportPDF}
          disabled={exporting}
          className="px-6 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {exporting ? "Gerando PDF…" : "Exportar PDF"}
        </button>
      </div>
    </div>
  );
}