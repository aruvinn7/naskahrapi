export interface KbbiRule {
  wrong: string;
  correct: string;
  explanation: string;
}

export const COMMON_KBBI_RULES: KbbiRule[] = [
  { wrong: 'analisa', correct: 'analisis', explanation: 'Baku menurut KBBI adalah analisis (kata serapan).' },
  { wrong: 'praktek', correct: 'praktik', explanation: 'Baku menurut KBBI adalah praktik.' },
  { wrong: 'resiko', correct: 'risiko', explanation: 'Baku menurut KBBI adalah risiko (bukan resiko).' },
  { wrong: 'obyek', correct: 'objek', explanation: 'Baku menurut KBBI menggunakan huruf "j": objek.' },
  { wrong: 'subyek', correct: 'subjek', explanation: 'Baku menurut KBBI menggunakan huruf "j": subjek.' },
  { wrong: 'aktifitas', correct: 'aktivitas', explanation: 'Baku menurut KBBI berakhiran -itas: aktivitas.' },
  { wrong: 'kreatifitas', correct: 'kreativitas', explanation: 'Baku menurut KBBI adalah kreativitas.' },
  { wrong: 'efektifitas', correct: 'efektivitas', explanation: 'Baku menurut KBBI adalah efektivitas.' },
  { wrong: 'tehnik', correct: 'teknik', explanation: 'Baku menurut KBBI adalah teknik (tanpa h).' },
  { wrong: 'tehnologi', correct: 'teknologi', explanation: 'Baku menurut KBBI adalah teknologi.' },
  { wrong: 'jadual', correct: 'jadwal', explanation: 'Baku menurut KBBI adalah jadwal.' },
  { wrong: 'kaedah', correct: 'kaidah', explanation: 'Baku menurut KBBI adalah kaidah.' },
  { wrong: 'hipotesa', correct: 'hipotesis', explanation: 'Baku menurut KBBI adalah hipotesis.' },
  { wrong: 'sintesa', correct: 'sintesis', explanation: 'Baku menurut KBBI adalah sintesis.' },
  { wrong: 'prosentase', correct: 'persentase', explanation: 'Baku menurut KBBI adalah persentase (diawali per-).' },
  { wrong: 'standarisasi', correct: 'standardisasi', explanation: 'Baku menurut KBBI adalah standardisasi (ada huruf d).' },
  { wrong: 'merubah', correct: 'mengubah', explanation: 'Berasal dari kata dasar "ubah", mendapat imbuhan me- menjadi mengubah.' },
  { wrong: 'mempengaruhi', correct: 'memengaruhi', explanation: 'Huruf "p" pada pengaruh luluh saat diberi awalan me-.' },
  { wrong: 'mempraktekkan', correct: 'mempraktikkan', explanation: 'Bentuk baku dari praktik adalah mempraktikkan.' },
  { wrong: 'mentargetkan', correct: 'menargetkan', explanation: 'Huruf "t" luluh saat diberi awalan me-.' },
  { wrong: 'mengenyampingkan', correct: 'mengesampingkan', explanation: 'Berasal dari samping: mengesampingkan.' },
  { wrong: 'kwalitas', correct: 'kualitas', explanation: 'Baku menurut KBBI menggunakan huruf k: kualitas.' },
  { wrong: 'frekwensi', correct: 'frekuensi', explanation: 'Baku menurut KBBI adalah frekuensi (tanpa w).' },
  { wrong: 'kongkret', correct: 'konkret', explanation: 'Baku menurut KBBI adalah konkret (tanpa g).' },
  { wrong: 'obyektif', correct: 'objektif', explanation: 'Baku menurut KBBI menggunakan huruf j: objektif.' },
  { wrong: 'subyektif', correct: 'subjektif', explanation: 'Baku menurut KBBI menggunakan huruf j: subjektif.' },
  { wrong: 'ijasah', correct: 'ijazah', explanation: 'Baku menurut KBBI menggunakan z: ijazah.' },
  { wrong: 'azas', correct: 'asas', explanation: 'Baku menurut KBBI menggunakan s: asas.' },
  { wrong: 'hirarki', correct: 'hierarki', explanation: 'Baku menurut KBBI adalah hierarki.' },
  { wrong: 'karir', correct: 'karier', explanation: 'Baku menurut KBBI adalah karier.' },
  { wrong: 'nomer', correct: 'nomor', explanation: 'Baku menurut KBBI adalah nomor.' },
  { wrong: 'silahkan', correct: 'silakan', explanation: 'Baku menurut KBBI adalah silakan (tanpa h).' },
  { wrong: 'terimakasih', correct: 'terima kasih', explanation: 'Ditulis terpisah: terima kasih.' },
  { wrong: 'sekedar', correct: 'sekadar', explanation: 'Baku menurut KBBI adalah sekadar (kata dasar: kadar).' },
];

export interface DetectedKbbiIssue {
  rule: KbbiRule;
  count: number;
}

export function detectKbbiIssues(text: string): DetectedKbbiIssue[] {
  const issues: DetectedKbbiIssue[] = [];

  for (const rule of COMMON_KBBI_RULES) {
    // Match whole words case-insensitively
    const regex = new RegExp(`\\b${rule.wrong}\\b`, 'gi');
    const matches = text.match(regex);
    if (matches && matches.length > 0) {
      issues.push({
        rule,
        count: matches.length
      });
    }
  }

  // Also check "dimana" when used as conjunction
  const dimanaMatches = text.match(/\bdimana\b/gi);
  if (dimanaMatches && dimanaMatches.length > 0) {
    issues.push({
      rule: {
        wrong: 'dimana',
        correct: 'di mana / yang',
        explanation: 'Kata "dimana" sebaiknya dipisah "di mana" (jika menunjukkan tempat) atau diganti "yang" jika sebagai konjungsi subordinatif.'
      },
      count: dimanaMatches.length
    });
  }

  return issues;
}

function matchCase(source: string, replacement: string): string {
  const lettersOnly = source.replace(/[^A-Za-z]/g, '');
  if (lettersOnly.length > 1 && lettersOnly === lettersOnly.toUpperCase()) {
    return replacement.toUpperCase();
  }
  if (source.length > 0 && source[0] === source[0].toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

export function applyKbbiCorrections(text: string): { correctedText: string; totalReplaced: number } {
  let result = text;
  let totalReplaced = 0;

  for (const rule of COMMON_KBBI_RULES) {
    const regex = new RegExp(`\\b${rule.wrong}\\b`, 'gi');
    const matches = result.match(regex);
    if (matches && matches.length > 0) {
      totalReplaced += matches.length;
      result = result.replace(regex, (match) => matchCase(match, rule.correct));
    }
  }

  // Correct "dimana" -> "di mana"
  const regexDimana = /\bdimana\b/gi;
  const matchDimana = result.match(regexDimana);
  if (matchDimana) {
    totalReplaced += matchDimana.length;
    result = result.replace(regexDimana, (match) => matchCase(match, 'di mana'));
  }

  return { correctedText: result, totalReplaced };
}
