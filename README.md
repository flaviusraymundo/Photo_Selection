# 📸 Photo Selection App

Uma aplicação **React + TypeScript** para **seleção, classificação e organização** de um conjunto fixo de 88 fotos já carregadas, com **exportação em PDF** e suporte total para **desktop e dispositivos móveis**.

---

## ✨ Funcionalidades
- **88 fotos carregadas automaticamente** no início
- **Classificação** de fotos em:  
  ✅ Positiva | ❌ Negativa | ⚪ Neutra
- **Seleção automática** das **7 fotos mais impactantes**
- **Organização livre (drag & drop)**:
  - Totalmente funcional no **desktop e mobile** (suporte a toque)
  - Área responsiva e rolável no celular
  - Botão **"Compactar para tela"** para reorganizar fotos visíveis
- **Debug de descrições** (modo teste rápido)
- **Atalho na tela inicial** para escolher 7 fotos manualmente e ir direto ao drag & drop
- **Exportação em PDF** com imagens e descrições completas

---

## 🖼 Fluxo de uso
1. **Classificar** as fotos como positiva, negativa ou neutra
2. **Selecionar** as 7 mais impactantes (automático ou manual via atalho)
3. **Organizar** livremente no layout (drag & drop)
4. **Exportar** relatório em PDF com imagens e descrições

---

## 🚀 Como usar (modo desenvolvedor)
```bash
# 1. Clone o repositório
git clone https://github.com/seuusuario/Photo_Selection.git

# 2. Instale as dependências
npm install

# 3. Rode o projeto localmente
npm run dev
```

---

## 🛠 Tecnologias utilizadas
- **React** (18+)
- **TypeScript**
- **Tailwind CSS**
- **jsPDF**
- **Vite**
- **Lucide React** (ícones)

---

## 📦 Dependências principais
\`\`\`json
{
  "jspdf": "^3.0.1",
  "lucide-react": "^0.344.0",
  "react": "^18.3.1",
  "react-dom": "^18.3.1"
}
\`\`\`

---

## 📱 Compatibilidade
- **Desktop**: Chrome, Firefox, Safari, Edge
- **Mobile**: iOS Safari, Android Chrome (drag & drop 100% funcional)

---

## 📝 Licença
Este projeto é distribuído sob a licença MIT.  
Sinta-se livre para usar, modificar e distribuir.
