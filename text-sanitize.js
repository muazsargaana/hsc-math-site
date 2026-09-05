(function () {
  const greek = {
    "π": "pi", "θ": "theta", "α": "alpha", "β": "beta", "γ": "gamma",
    "δ": "delta", "λ": "lambda", "μ": "mu", "σ": "sigma", "ω": "omega",
    "Π": "Pi", "Θ": "Theta", "Ω": "Omega", "Σ": "Sigma"
  };

  const symbolMap = [
    [/≤/g, "<="], [/≥/g, ">="], [/≠/g, "!="], [/≈/g, "~"], [/±/g, "+/-"],
    [/×/g, "x"], [/÷/g, "/"], [/√/g, "sqrt "], [/∞/g, "infinity"], [/∈/g, " in "],
    [/∴/g, "therefore"], [/∫/g, "integral "], [/→/g, "->"], [/−/g, "-"],
    [/²/g, "^2"], [/³/g, "^3"], [/⁻¹/g, "^-1"], [/·/g, " dot "],
    [/[“”]/g, '"'], [/[‘’]/g, "'"], [/[–—]/g, "-"], [/⋯/g, "..."]
  ];

  function cleanMathText(value) {
    let text = String(value ?? "");

    // Repair the specific glyph corruption produced by the syllabus PDF extraction.
    text = text
      .replace(/ଵ\s*௙\s*\(௫\)/g, "1/f(x)")
      .replace(/ඥ\s*𝑓\s*\(𝑥\)/g, "sqrt(f(x))")
      .replace(/−\s*గ\s*ଶ/g, "-pi/2")
      .replace(/గ\s*ଶ/g, "pi/2")
      .replace(/−\s*஠\s*ଶ/g, "-pi/2")
      .replace(/஠\s*ଶ/g, "pi/2");

    // Convert mathematical styled letters/numbers and compatibility glyphs to plain text.
    text = text.normalize("NFKC");

    Object.entries(greek).forEach(([symbol, word]) => {
      text = text.split(symbol).join(word);
    });

    symbolMap.forEach(([pattern, replacement]) => {
      text = text.replace(pattern, replacement);
    });

    // Common remnants from the PDF's embedded maths font mappings.
    text = text
      .replace(/ඥ/g, "sqrt ")
      .replace(/௫/g, "x")
      .replace(/௡/g, "_n")
      .replace(/ଵ/g, "1")
      .replace(/ଶ/g, "2")
      .replace(/଴/g, "0")
      .replace(/ି/g, "-");

    // Absolute safety net: mastery labels are intentionally ASCII-only.
    // Anything still outside printable ASCII at this point is extraction garbage,
    // not information we should show to the user.
    text = text.replace(/[^\x20-\x7E]/g, "");

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
