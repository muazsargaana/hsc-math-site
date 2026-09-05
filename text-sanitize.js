(function () {
  const greek = {
    "π": "pi", "θ": "theta", "α": "alpha", "β": "beta", "γ": "gamma",
    "δ": "delta", "λ": "lambda", "μ": "mu", "σ": "sigma", "ω": "omega",
    "Π": "Pi", "Θ": "Theta", "Ω": "Omega", "Σ": "Sigma"
  };

  function cleanMathText(value) {
    let text = String(value ?? "");

    // Fix known PDF-extraction corruption before Unicode normalization.
    text = text
      .replace(/ଵ\s*௙\s*\(௫\)/g, "1/f(x)")
      .replace(/ඥ\s*𝑓\s*\(𝑥\)/g, "sqrt(f(x))")
      .replace(/−\s*గ\s*ଶ/g, "-pi/2")
      .replace(/గ\s*ଶ/g, "pi/2")
      .replace(/−\s*஠\s*ଶ/g, "-pi/2")
      .replace(/஠\s*ଶ/g, "pi/2")
      .replace(/([A-Za-z𝑎-𝑧𝐴-𝑍])௡/g, "$1_n")
      .replace(/([A-Za-z𝑎-𝑧𝐴-𝑍])ିଵ/g, "$1^-1")
      .replace(/([A-Za-z𝑎-𝑧𝐴-𝑍])ଶ/g, "$1^2")
      .replace(/²/g, "^2")
      .replace(/³/g, "^3")
      .replace(/⁻¹/g, "^-1");

    // Convert mathematical italic/bold Unicode letters to ordinary text.
    text = text.normalize("NFKC");

    Object.entries(greek).forEach(([symbol, word]) => {
      text = text.split(symbol).join(word);
    });

    text = text
      .replace(/ඥ/g, "sqrt ")
      .replace(/௫/g, "x")
      .replace(/௡/g, "_n")
      .replace(/ଵ/g, "1")
      .replace(/ଶ/g, "2")
      .replace(/଴/g, "0")
      .replace(/ି/g, "-")
      .replace(/≤/g, "<=")
      .replace(/≥/g, ">=")
      .replace(/≠/g, "!=")
      .replace(/≈/g, "~")
      .replace(/±/g, "+/-")
      .replace(/×/g, "x")
      .replace(/÷/g, "/")
      .replace(/√/g, "sqrt ")
      .replace(/∞/g, "infinity")
      .replace(/∈/g, " in ")
      .replace(/∴/g, "therefore")
      .replace(/∫/g, "integral ")
      .replace(/→/g, "->")
      .replace(/−/g, "-")
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[–—]/g, "-")
      .replace(/⋯/g, "...");

    // Remove any leftover Indic/Sinhala PDF glyphs rather than showing alien characters.
    text = text.replace(/[\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0D80-\u0DFF]/g, "");

    // Remove replacement characters and control garbage, then tidy spacing.
    text = text
      .replace(/\uFFFD/g, "")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
      .replace(/\s+([,.;:!?])/g, "$1")
      .replace(/\(\s+/g, "(")
      .replace(/\s+\)/g, ")")
      .replace(/\s{2,}/g, " ")
      .trim();

    return text;
  }

  window.cleanMathText = cleanMathText;

  if (Array.isArray(window.MASTERY_RAW)) {
    window.MASTERY_RAW.forEach(topic => {
      topic.n = cleanMathText(topic.n);
      (topic.x || []).forEach(section => {
        section.n = cleanMathText(section.n);
        section.k = (section.k || []).map(cleanMathText);
      });
    });
  }
})();
