// Script para verificar descrições incompletas
const fs = require('fs');

// Ler o arquivo JSON
const data = JSON.parse(fs.readFileSync('public/photoDescriptions.json', 'utf8'));

console.log('=== VERIFICAÇÃO DE DESCRIÇÕES ===\n');

Object.entries(data).forEach(([key, flower]) => {
  const descLength = flower.description.length;
  const hasQualidades = flower.description.includes('Qualidades Positivas');
  const hasProblema = flower.description.includes('Problema Alvo');
  const hasNatureza = flower.description.includes('Natureza Curativa');
  
  console.log(`${key}:`);
  console.log(`  Título: ${flower.title}`);
  console.log(`  Tamanho: ${descLength} caracteres`);
  console.log(`  Tem Qualidades Positivas: ${hasQualidades ? '✅' : '❌'}`);
  console.log(`  Tem Problema Alvo: ${hasProblema ? '✅' : '❌'}`);
  console.log(`  Tem Natureza Curativa: ${hasNatureza ? '✅' : '❌'}`);
  
  // Marcar como suspeita se muito curta ou faltando seções
  if (descLength < 200 || !hasQualidades || !hasProblema || !hasNatureza) {
    console.log(`  🚨 SUSPEITA DE INCOMPLETA!`);
  }
  
  console.log('---\n');
});