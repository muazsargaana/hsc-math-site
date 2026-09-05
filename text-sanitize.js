(function () {
  const greek = {
    "π": "pi", "θ": "theta", "α": "alpha", "β": "beta", "γ": "gamma",
    "δ": "delta", "λ": "lambda", "μ": "mu", "σ": "sigma", "ω": "omega",
    "Π": "Pi", "Θ": "Theta", "Ω": "Omega", "Σ": "Sigma"
  };

  const symbolMap = [
    [/≤/g, "<="], [/≥/g, ">="], [/≠/g, "!="], [/≈/g, "~"], [/±/g, "+/-"],
    [/×/g, "x"], [/÷/g, "/"], [/√/g, "sqrt"], [/∞/g, "infinity"], [/∈/g, " in "],
    [/∴/g, "therefore"], [/∫/g, "integral "], [/→/g, "->"], [/−/g, "-"],
    [/²/g, "^2"], [/³/g, "^3"], [/⁻¹/g, "^-1"], [/·/g, " dot "],
    [/[“”]/g, '"'], [/[‘’]/g, "'"], [/[–—]/g, "-"], [/⋯/g, "..."]
  ];

  function cleanMathText(value) {
    let text = String(value ?? "");

    // Exact repairs for the broken embedded-font mappings in the NESA PDF.
    text = text
      .replace(/ଵ\s*௙\s*\(௫\)/g, "1/f(x)")
      .replace(/ඥ\s*𝑓\s*\(𝑥\)/g, "sqrt(f(x))")
      .replace(/𝑦ଶ/g, "y^2")
      .replace(/𝑓ିଵ/g, "f^-1")
      .replace(/sinିଵ/g, "sin^-1")
      .replace(/cosିଵ/g, "cos^-1")
      .replace(/tanିଵ/g, "tan^-1")
      .replace(/𝑎௡ିଵ𝑥௡ିଵ/g, "a_(n-1)x^(n-1)")
      .replace(/𝑎௡𝑥௡/g, "a_n x^n")
      .replace(/𝑎ଶ𝑥ଶ/g, "a_2 x^2")
      .replace(/𝑎ଵ𝑥/g, "a_1 x")
      .replace(/𝑎଴/g, "a_0")
      .replace(/−\s*గ\s*ଶ/g, "-pi/2")
      .replace(/గ\s*ଶ/g, "pi/2")
      .replace(/−\s*஠\s*ଶ/g, "-pi/2")
      .replace(/஠\s*ଶ/g, "pi/2");

    text = text.normalize("NFKC");

    Object.entries(greek).forEach(([symbol, word]) => {
      text = text.split(symbol).join(word);
    });
    symbolMap.forEach(([pattern, replacement]) => { text = text.replace(pattern, replacement); });

    // Remaining known extraction remnants.
    text = text
      .replace(/ඥ/g, "sqrt")
      .replace(/௫/g, "x")
      .replace(/௡ିଵ/g, "(n-1)")
      .replace(/௡/g, "n")
      .replace(/ଵ/g, "1")
      .replace(/ଶ/g, "2")
      .replace(/଴/g, "0")
      .replace(/ି/g, "-");

    // Never display stray Indic/Sinhala extraction glyphs or replacement characters.
    text = text
      .replace(/[\u0B80-\u0BFF\u0C00-\u0C7F\u0D80-\u0DFF]/g, "")
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