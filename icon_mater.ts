function normalizeHebrew(str) {
    return str
      .replace(/[\u0591-\u05C7]/g, "")   // מסיר ניקוד
      .replace(/[^\u0590-\u05FF ]/g, "") // רק אותיות עבריות
      .toLowerCase()
      .trim();
  }
  
  function normalizeEnglish(str) {
    return str.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").trim();
  }
  
  export function matchIcon(title) {
    if (!title) return { icon: "default", reason: "empty title" };
  
    const heTitle = normalizeHebrew(title);
    const enTitle = normalizeEnglish(title);
  
    let best = null;
  
    for (const [icon, keywords] of Object.entries(yotoIcons)) {
      let score = 0;
      for (const kw of keywords) {
        if (/[\u0590-\u05FF]/.test(kw)) {
          // מילה בעברית
          if (heTitle.includes(normalizeHebrew(kw))) score += 2;
        } else {
          // מילה באנגלית
          if (enTitle.includes(normalizeEnglish(kw))) score += 1;
        }
      }
      if (score > 0 && (!best || score > best.score)) {
        best = { icon, score };
      }
    }
  
    return best
      ? { icon: best.icon, reason: `keyword score=${best.score}` }
      : { icon: "default", reason: "no keyword match" };
  }
  