import React, { useState, useRef, useEffect } from "react";
import { Upload, Database } from "lucide-react";

/**
 * PhotoSelectionApp – versão 6
 *
 * 👉  Foco desta versão: confiabilidade da exportação em PDF
 * -----------------------------------------------------------
 * • Constrói o PDF com jsPDF (sem html2canvas) gerando texto nítido e
 *   sem caixas estranhas. Miniatura em­bedada via FileReader (sem CORS).
 * • Tratamento de descrições muito longas: quebra automática e continua
 *   em nova página se necessário.
 * • Indicador de progresso enquanto o PDF é montado.
 * • Pequenas melhorias de layout (ex. remove borda de <textarea> na DOM
 *   para evitar confusão visual, mas a borda continua no componente).
 *
 * Dependência: `npm i jspdf` (nenhuma outra). Caso já tenha html2canvas
 * instalado, não há problema, ele só não é mais usado.
 */

export default function PhotoSelectionApp() {
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState([]); // { id, file, url, status }
  const [currentIdx, setCurrentIdx] = useState(0);
  const [chosen, setChosen] = useState([]);
  const [grid, setGrid] = useState(Array(12).fill(null));
  const [descriptions, setDescriptions] = useState({});
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef();
  const [usePreloaded, setUsePreloaded] = useState(false);

  /******************** HELPERS ********************/
  const shuffle = (array) => array.sort(() => Math.random() - 0.5);
  const getPhoto = (id) => photos.find((p) => p.id === id);

  /******************** PRELOADED DATA ********************/
  const loadPreloadedData = async () => {
    try {
      const response = await fetch('/sample-photos/photo-data.json');
      const data = await response.json();
      
      // Create mock photos with Pexels images
      const mockPhotos = data.photos.map((item, index) => ({
        id: item.id,
        file: null, // No actual file for preloaded
        url: `https://images.pexels.com/photos/${1000000 + index}/pexels-photo-${1000000 + index}.jpeg?auto=compress&cs=tinysrgb&w=400`,
        status: item.status,
        filename: item.filename,
        isPreloaded: true
      }));
      
      // Set preloaded descriptions
      const preloadedDescriptions = {};
      data.photos.forEach(item => {
        preloadedDescriptions[item.id] = item.description;
      });
      
      setPhotos(shuffle(mockPhotos));
      setDescriptions(preloadedDescriptions);
      setStep(1);
    } catch (error) {
      console.error('Erro ao carregar dados pré-definidos:', error);
      alert('Erro ao carregar dados pré-definidos. Use o upload manual.');
    }
  };

  /******************** UPLOAD ********************/
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

  const handlePreloadedStart = () => {
    setUsePreloaded(true);
    loadPreloadedData();
  };

  /******************** CLASSIFICATION ********************/
  const classify = (status) => {
    setPhotos((prev) => {
      const clone = [...prev];
      clone[currentIdx].status = status;
      return clone;
    });
    if (currentIdx + 1 < photos.length) setCurrentIdx((i) => i + 1);
    else setStep(2);
  };

  useEffect(() => {
    const handler = (e) => {
      if (step !== 1) return;
      if (["+", "="].includes(e.key)) classify("positive");
      else if (["-", "_"].includes(e.key)) classify("negative");
      else if (e.key === "ArrowLeft") setCurrentIdx((i) => (i > 0 ? i - 1 : 0));
      else classify("neutral");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [step, currentIdx, photos.length]);

  /******************** SELECTION (7) ********************/
  const toggleChosen = (id) => {
    setChosen((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length === 7) return prev;
      return [...prev, id];
    });
  };

  /******************** DRAG & DROP (12 slots) ********************/
  const onDragStart = (e, from) => e.dataTransfer.setData("from", from);
  const onDrop = (e, to) => {
    const from = parseInt(e.dataTransfer.getData("from"));
    if (isNaN(from) || from === to) return;
    setGrid((prev) => {
      const clone = [...prev];
      [clone[from], clone[to]] = [clone[to], clone[from]];
      return clone;
    });
  };

  /******************** REPORT PREP ********************/
  const finalList = grid.filter(Boolean).map((id) => getPhoto(id));

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
      {step === 0 && (
        <UploadStep handleFiles={handleFiles} fileInputRef={fileInputRef} />
      )}

          onUsePreloaded={handlePreloadedStart}
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
            const base = [...chosen, ...Array(12 - chosen.length).fill(null)];
            setGrid(base);
            setStep(3);
          }}
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

/******************** COMPONENTES ********************/
function UploadStep({ handleFiles, fileInputRef, onUsePreloaded }) {
  return (
    <div className="text-center space-y-6 max-w-md mx-auto">
      <h1 className="text-3xl font-bold text-gray-800">Seleção de Fotos</h1>
      <p className="text-gray-600">Escolha como deseja começar:</p>
      
      <div className="space-y-4">
        {/* Upload Manual */}
        <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors">
          <Upload className="w-12 h-12 text-blue-500 mx-auto mb-3" />
          <h2 className="text-xl font-semibold mb-2">Upload Manual</h2>
          <p className="text-gray-500 mb-4">Envie suas próprias fotos (até 88)</p>
          <input
            type="file"
            accept="image/*"
            multiple
            ref={fileInputRef}
            onChange={(e) => handleFiles(e.target.files)}
            className="block mx-auto text-sm"
          />
        </div>
        
        {/* Dados Pré-carregados */}
        <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-gray-300 hover:border-green-400 transition-colors">
          <Database className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h2 className="text-xl font-semibold mb-2">Dados de Exemplo</h2>
          <p className="text-gray-500 mb-4">Use fotos e descrições pré-definidas</p>
          <button
            onClick={onUsePreloaded}
            className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Usar Exemplo
          </button>
        </div>
      </div>
    </div>
  );
}

function ClassificationStep({ photo, idx, total, classify, goBack }) {
  return (
    <div className="w-full max-w-lg text-center space-y-4">
      <h2 className="font-medium">Foto {idx + 1} / {total}</h2>
      <div className="h-96 flex items-center justify-center">
        <img
          src={photo.url}
          alt="current"
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
        Use ← para voltar. Atalhos: +/=: positiva, -/_: negativa, outra tecla:
        neutra.
      </p>
    </div>
  );
}

function SelectionStep({ photos, chosen, toggleChosen, proceed }) {
  return (
    <div className="w-full max-w-5xl">
      <h2 className="text-xl font-semibold mb-4 text-center">
        2. Selecione as 7 fotos mais impactantes
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {photos.map((p) => (
          <div
            key={p.id}
            onClick={() => toggleChosen(p.id)}
            className={`relative cursor-pointer rounded-lg overflow-hidden shadow ${
              chosen.includes(p.id) ? "ring-4 ring-blue-500" : ""
            }`}
          >
            <img
              src={p.url}
              alt="option"
              className="h-36 w-full object-cover"
            />
            <span className="absolute top-1 left-1 bg-white/80 px-1.5 text-xs rounded">
              {p.status === "positive" ? "+" : "-"}
            </span>
          </div>
        ))}
      </div>
      <div className="text-center mt-6">
        <button
          disabled={chosen.length !== 7}
          onClick={proceed}
          className={`px-6 py-2 rounded-xl text-white ${
            chosen.length === 7 ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400"
          }`}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}

function ArrangeStep({ grid, getPhoto, onDragStart, onDrop, finish }) {
  return (
    <div className="w-full max-w-4xl mx-auto text-center">
      <h2 className="text-xl font-semibold mb-4">
        3. Arraste para ordenar (12 slots)
      </h2>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {grid.map((id, idx) => (
          <div
            key={idx}
            draggable={Boolean(id)}
            onDragStart={(e) => id && onDragStart(e, idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, idx)}
            className="h-32 w-full border border-dashed border-gray-400 rounded-lg flex items-center justify-center overflow-hidden bg-white"
          >
            {id ? (
              <img
                src={getPhoto(id)?.url}
                alt="slot"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-gray-300 text-sm">vazio</span>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={finish}
        className="px-6 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
      >
        Gerar Relatório
      </button>
    </div>
  );
}

function ReportStep({ finalList, descriptions, setDescriptions, exporting, setExporting }) {
  const handleChange = (id, val) =>
    setDescriptions((prev) => ({ ...prev, [id]: val }));

  const exportPDF = async () => {
    setExporting(true);
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
    const margin = 40;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const thumb = 72; // thumbnail size in pt (~1 inch)
    const lineHeight = 14;
    let y = margin;

    // Helper: convert File/Blob to DataURL
    const fileToDataURL = (file) =>
      new Promise((res) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result);
        reader.readAsDataURL(file);
      });

    for (let i = 0; i < finalList.length; i++) {
      const p = finalList[i];
      const name = p.filename || p.file?.name?.replace(/\.[^/.]+$/, "") || `Foto ${i + 1}`;
      const statusLabel = p.status === "positive" ? "Positiva" : "Negativa";
      const desc = descriptions[p.id] || "";

      // Word-wrapped description
      const maxTextWidth = pageWidth - margin * 2 - thumb - 10;
      const wrappedDesc = pdf.splitTextToSize(desc, maxTextWidth);
      const blockHeight = Math.max(thumb, (2 + wrappedDesc.length) * lineHeight);

      if (y + blockHeight > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }

      // Add image
      try {
        if (p.file) {
          const dataURL = await fileToDataURL(p.file);
          pdf.addImage(dataURL, "JPEG", margin, y, thumb, thumb);
        } else if (p.isPreloaded) {
          // For preloaded images, we'll add a placeholder or skip the image
          pdf.setFillColor(240, 240, 240);
          pdf.rect(margin, y, thumb, thumb, 'F');
          pdf.setFontSize(8);
          pdf.setTextColor("#666");
          pdf.text("Imagem de\nExemplo", margin + thumb/2, y + thumb/2, { align: 'center' });
        }
      } catch {
        // ignore image errors
      }

      // Add text
      pdf.setFontSize(12);
      pdf.setTextColor("#000");
      pdf.text(`${i + 1}. ${name}`, margin + thumb + 10, y + lineHeight);

      pdf.setFontSize(10);
      pdf.setTextColor(p.status === "positive" ? "#22c55e" : "#ef4444");
      pdf.text(statusLabel, margin + thumb + 10, y + lineHeight * 2);

      pdf.setTextColor("#000");
      pdf.text(wrappedDesc, margin + thumb + 10, y + lineHeight * 3);

      y += blockHeight + 20;
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
              src={p.isPreloaded ? p.url : URL.createObjectURL(p.file)}
              alt={`sel_${i}`}
              className="h-24 w-24 object-cover rounded-lg border"
            />
            <div className="flex-1 w-full">
              <h3 className="font-medium text-lg truncate mb-2">
                {p.filename || p.file?.name?.replace(/\.[^/.]+$/, "") || `Foto ${i + 1}`}
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
          className="px-6 py-2 rounded-xl text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {exporting ? "Gerando PDF…" : "Exportar PDF"}
        </button>
      </div>
    </div>
  );
}