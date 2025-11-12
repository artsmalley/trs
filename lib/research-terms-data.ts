/**
 * Research Terms Data Structure
 * Extracted from research_terms.md for UI consumption
 */

export interface ResearchTerm {
  english: string;
  japanese: string;
  notes?: string;
}

export interface TermCategory {
  id: string;
  name: string;
  subcategories: {
    id: string;
    name: string;
    terms: ResearchTerm[];
  }[];
}

export const RESEARCH_CATEGORIES: TermCategory[] = [
  {
    id: "pd",
    name: "Product Development (PD)",
    subcategories: [
      {
        id: "general-pd",
        name: "General PD Terms",
        terms: [
          { english: "Product Development", japanese: "製品開発" },
          { english: "Engine Development", japanese: "エンジン開発" },
          { english: "Advanced Engineering", japanese: "先行開発" },
          { english: "Design Process", japanese: "設計プロセス" },
          { english: "Design Verification", japanese: "設計検証" },
          { english: "Prototype", japanese: "試作" },
          { english: "Testing", japanese: "試験" },
          { english: "Validation", japanese: "妥当性確認" },
        ],
      },
      {
        id: "cad-plm",
        name: "CAD/PLM Systems",
        terms: [
          { english: "CAD", japanese: "CAD" },
          { english: "CAD Implementation", japanese: "CAD導入" },
          { english: "3D CAD", japanese: "三次元CAD" },
          { english: "PLM", japanese: "PLM" },
          { english: "PLM Implementation", japanese: "PLM実装" },
          { english: "Product Data Management", japanese: "製品データ管理" },
          { english: "Design Data Management", japanese: "設計データ管理" },
        ],
      },
      {
        id: "simulation",
        name: "Simulation & Analysis",
        terms: [
          { english: "Simulation", japanese: "シミュレーション" },
          { english: "Simulation-Driven Design", japanese: "シミュレーション駆動設計" },
          { english: "Computer-Aided Engineering", japanese: "CAE" },
          { english: "Numerical Analysis", japanese: "数値解析" },
          { english: "Finite Element Analysis", japanese: "有限要素解析" },
          { english: "Computational Fluid Dynamics", japanese: "流体解析" },
          { english: "Thermal Analysis", japanese: "熱解析" },
          { english: "Structural Analysis", japanese: "構造解析" },
        ],
      },
      {
        id: "digital-twins",
        name: "Digital Twins & Virtual Validation",
        terms: [
          { english: "Digital Twin", japanese: "デジタルツイン" },
          { english: "Virtual Validation", japanese: "仮想検証" },
          { english: "Virtual Prototyping", japanese: "バーチャル試作" },
        ],
      },
      {
        id: "concurrent-eng",
        name: "Simultaneous Engineering",
        terms: [
          { english: "Simultaneous Engineering", japanese: "同時並行開発" },
          { english: "Concurrent Design", japanese: "並行設計" },
          { english: "Collaborative Development", japanese: "協調開発" },
          { english: "Design-for-Manufacturing", japanese: "DFM" },
        ],
      },
    ],
  },
  {
    id: "pe",
    name: "Production Engineering (PE)",
    subcategories: [
      {
        id: "core-pe",
        name: "Core PE Terms",
        terms: [
          { english: "Production Engineering", japanese: "生産技術", notes: "NOT 'manufacturing technology'" },
          { english: "Production Preparation", japanese: "生産準備" },
          { english: "Mass Production Preparation", japanese: "量産準備" },
          { english: "Production Launch", japanese: "立ち上げ" },
          { english: "24-Month Process", japanese: "24ヶ月工程" },
        ],
      },
      {
        id: "process-design",
        name: "Process Design",
        terms: [
          { english: "Process Design", japanese: "工程設計" },
          { english: "Process Flow", japanese: "工程フロー" },
          { english: "Operation Sequence", japanese: "作業順序" },
        ],
      },
      {
        id: "equipment-planning",
        name: "Equipment Planning",
        terms: [
          { english: "Equipment Planning", japanese: "設備計画" },
          { english: "Machine Tool", japanese: "工作機械" },
          { english: "Equipment Specification", japanese: "設備仕様" },
          { english: "Production Capacity", japanese: "生産能力" },
        ],
      },
      {
        id: "standards",
        name: "Standards & Drawings",
        terms: [
          { english: "Standardization", japanese: "標準化" },
          { english: "Toyota Manufacturing Standard", japanese: "トヨタ生産標準" },
          { english: "Work Standard", japanese: "作業標準" },
          { english: "Operation Drawing", japanese: "工程図", notes: "NOT design drawing" },
          { english: "Manufacturing Drawing", japanese: "工作図面" },
          { english: "Jig Drawing", japanese: "治具図" },
          { english: "QC Process Chart", japanese: "QC工程表" },
          { english: "Quality Standard", japanese: "品質標準" },
        ],
      },
      {
        id: "tooling",
        name: "Tooling Engineering",
        terms: [
          { english: "Jig", japanese: "治具", notes: "NOT 'tool'" },
          { english: "Fixture", japanese: "治具" },
          { english: "Jig Design", japanese: "治具設計" },
          { english: "Positioning", japanese: "位置決め" },
          { english: "Inspection Fixture", japanese: "検査治具" },
          { english: "Poka-Yoke", japanese: "ポカヨケ" },
          { english: "Clamp", japanese: "クランプ" },
        ],
      },
      {
        id: "machining",
        name: "Machining & Manufacturing Processes",
        terms: [
          { english: "Machining Technology", japanese: "加工技術" },
          { english: "Process Physics", japanese: "加工物理" },
          { english: "Machining", japanese: "機械加工" },
          { english: "Grinding", japanese: "研削" },
          { english: "Grinding Machine", japanese: "研削盤" },
          { english: "Grinding Wheel", japanese: "砥石" },
          { english: "Polishing", japanese: "研磨" },
          { english: "Cutting", japanese: "切削" },
          { english: "Casting", japanese: "鋳造" },
          { english: "Pressing", japanese: "プレス" },
          { english: "Plastic Working", japanese: "塑性加工" },
        ],
      },
      {
        id: "machine-tools",
        name: "Machine Tools & Equipment",
        terms: [
          { english: "Machine Tool", japanese: "工作機械" },
          { english: "Lathe", japanese: "旋盤" },
          { english: "Milling Machine", japanese: "フライス盤" },
          { english: "Grinding Machine", japanese: "研削盤" },
          { english: "Drilling Machine", japanese: "ボール盤" },
          { english: "Machining Center", japanese: "マシニングセンタ" },
          { english: "Cutting Tool", japanese: "工具" },
        ],
      },
      {
        id: "process-capability",
        name: "Process Capability & Precision",
        terms: [
          { english: "Process Capability", japanese: "工程能力" },
          { english: "Cp/Cpk", japanese: "Cp/Cpk" },
          { english: "Precision Management", japanese: "精度管理" },
          { english: "Machine Accuracy", japanese: "機械精度" },
          { english: "Static Accuracy", japanese: "静的精度" },
        ],
      },
    ],
  },
  {
    id: "tps",
    name: "Manufacturing/Operations (TPS)",
    subcategories: [
      {
        id: "tps-core",
        name: "TPS Core Principles",
        terms: [
          { english: "Toyota Production System", japanese: "トヨタ生産方式" },
          { english: "TPS", japanese: "TPS" },
          { english: "Just-In-Time", japanese: "ジャストインタイム" },
          { english: "Jidoka", japanese: "自働化", notes: "Automation with human touch" },
          { english: "Kanban", japanese: "かんばん" },
        ],
      },
      {
        id: "kaizen",
        name: "Kaizen & Continuous Improvement",
        terms: [
          { english: "Kaizen", japanese: "カイゼン" },
          { english: "Process Improvement", japanese: "工程改善" },
          { english: "Technical Improvement", japanese: "技術改善" },
          { english: "Equipment Improvement", japanese: "設備改善" },
        ],
      },
      {
        id: "daily-management",
        name: "Daily Management & Operations",
        terms: [
          { english: "Production Management", japanese: "生産管理" },
          { english: "Daily Management", japanese: "日常管理" },
          { english: "Manufacturing", japanese: "製造" },
        ],
      },
      {
        id: "smed",
        name: "Setup Reduction (SMED)",
        terms: [
          { english: "Setup Change", japanese: "段取り替え" },
          { english: "SMED", japanese: "SMED" },
          { english: "Setup Time Reduction", japanese: "段取り時間短縮" },
          { english: "External Setup", japanese: "外段取り" },
          { english: "Internal Setup", japanese: "内段取り" },
        ],
      },
      {
        id: "quality",
        name: "Quality Control & Assurance",
        terms: [
          { english: "Quality Control", japanese: "品質管理" },
          { english: "Quality Assurance", japanese: "品質保証" },
          { english: "Statistical Process Control", japanese: "統計的工程管理" },
          { english: "In-Process Inspection", japanese: "工程内検査" },
          { english: "Defect Prevention", japanese: "不良予防" },
        ],
      },
      {
        id: "measurement",
        name: "Precision Measurement",
        terms: [
          { english: "Precision Measurement", japanese: "精密測定" },
          { english: "Measurement", japanese: "測定" },
          { english: "Measurement Technology", japanese: "測定技術" },
          { english: "Inspection", japanese: "検査" },
          { english: "Three-Dimensional Measurement", japanese: "三次元測定" },
        ],
      },
      {
        id: "automation",
        name: "Automation & Control Systems",
        terms: [
          { english: "Automation", japanese: "自動化" },
          { english: "Automation Technology", japanese: "自動化技術" },
          { english: "Robot", japanese: "ロボット" },
          { english: "Control", japanese: "制御" },
          { english: "Control System", japanese: "制御システム" },
          { english: "Sensor", japanese: "センサ" },
          { english: "Manufacturing Execution System", japanese: "生産管理システム" },
        ],
      },
    ],
  },
  {
    id: "cross-cutting",
    name: "Cross-Cutting Terms",
    subcategories: [
      {
        id: "management",
        name: "Management Systems",
        terms: [
          { english: "Chief Engineer System", japanese: "主査制度" },
          { english: "Chief Engineer", japanese: "チーフエンジニア" },
          { english: "Obeya", japanese: "大部屋", notes: "War Room / Integration Space" },
        ],
      },
      {
        id: "digital-transformation",
        name: "Digital Transformation",
        terms: [
          { english: "Digital Transformation", japanese: "デジタル化" },
          { english: "DX", japanese: "DX" },
          { english: "Industry 4.0", japanese: "Industry 4.0" },
          { english: "Internet of Things", japanese: "IoT" },
        ],
      },
    ],
  },
];

/**
 * Get all terms for a specific category (flattened)
 */
export function getTermsForCategory(categoryId: string): ResearchTerm[] {
  const category = RESEARCH_CATEGORIES.find((c) => c.id === categoryId);
  if (!category) return [];

  return category.subcategories.flatMap((sub) => sub.terms);
}

/**
 * Get all unique terms across all categories
 */
export function getAllTerms(): ResearchTerm[] {
  return RESEARCH_CATEGORIES.flatMap((cat) =>
    cat.subcategories.flatMap((sub) => sub.terms)
  );
}

/**
 * Search terms by English or Japanese text
 */
export function searchTerms(query: string): ResearchTerm[] {
  const lowerQuery = query.toLowerCase();
  return getAllTerms().filter(
    (term) =>
      term.english.toLowerCase().includes(lowerQuery) ||
      term.japanese.includes(query)
  );
}
