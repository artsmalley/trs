/**
 * Research Terms Data Structure
 * Extracted from research_terms.md (Nov 14, 2025)
 * 228 curated terms organized in 4-level hierarchy:
 * Track → Subcategory → Sub-area → Terms
 */

export interface ResearchTerm {
  english: string;
  japanese: string;
  notes?: string;
  track: "PD" | "PE" | "TPS" | "Cross-Cutting";
  subcategory: string;
  subArea?: string; // For nested groupings (e.g., Tooling Engineering sub-areas)
}

export interface SubArea {
  id: string;
  name: string;
  terms: ResearchTerm[];
}

export interface Subcategory {
  id: string;
  name: string;
  subAreas?: SubArea[]; // For Tooling Engineering
  terms?: ResearchTerm[]; // For non-nested subcategories
}

export interface Track {
  id: string;
  name: string;
  subcategories: Subcategory[];
}

// ============================================================================
// Track 1: Product Development (PD) - 4 subcategories
// ============================================================================

export const PD_TRACK: Track = {
  id: "pd",
  name: "Product Development (PD)",
  subcategories: [
    {
      id: "design-development",
      name: "Design & Development Process",
      terms: [
        { english: "Product Development", japanese: "製品開発", track: "PD", subcategory: "Design & Development Process" },
        { english: "Engine Development", japanese: "エンジン開発", track: "PD", subcategory: "Design & Development Process" },
        { english: "Advanced Engineering", japanese: "先行開発", track: "PD", subcategory: "Design & Development Process" },
        { english: "Design Process", japanese: "設計プロセス", track: "PD", subcategory: "Design & Development Process" },
        { english: "Design Verification", japanese: "設計検証", track: "PD", subcategory: "Design & Development Process" },
        { english: "Design Drawing", japanese: "設計図", track: "PD", subcategory: "Design & Development Process" },
        { english: "Prototype", japanese: "試作", track: "PD", subcategory: "Design & Development Process" },
        { english: "Testing", japanese: "試験", track: "PD", subcategory: "Design & Development Process" },
        { english: "Validation", japanese: "妥当性確認", track: "PD", subcategory: "Design & Development Process" },
        { english: "Simultaneous Engineering", japanese: "同時並行開発", track: "PD", subcategory: "Design & Development Process" },
        { english: "Concurrent Design", japanese: "並行設計", track: "PD", subcategory: "Design & Development Process" },
        { english: "Collaborative Development", japanese: "協調開発", track: "PD", subcategory: "Design & Development Process" },
        { english: "Design-for-Manufacturing", japanese: "DFM", track: "PD", subcategory: "Design & Development Process" },
      ],
    },
    {
      id: "cad-plm",
      name: "CAD/PLM Systems & Data Management",
      terms: [
        { english: "CAD", japanese: "CAD", track: "PD", subcategory: "CAD/PLM Systems & Data Management" },
        { english: "CAD Implementation", japanese: "CAD導入", track: "PD", subcategory: "CAD/PLM Systems & Data Management" },
        { english: "3D CAD", japanese: "三次元CAD", track: "PD", subcategory: "CAD/PLM Systems & Data Management" },
        { english: "PLM", japanese: "PLM", track: "PD", subcategory: "CAD/PLM Systems & Data Management" },
        { english: "PLM Implementation", japanese: "PLM実装", track: "PD", subcategory: "CAD/PLM Systems & Data Management" },
        { english: "Product Data Management", japanese: "製品データ管理", track: "PD", subcategory: "CAD/PLM Systems & Data Management" },
        { english: "Design Data Management", japanese: "設計データ管理", track: "PD", subcategory: "CAD/PLM Systems & Data Management" },
      ],
    },
    {
      id: "simulation-validation",
      name: "Simulation & Virtual Validation",
      terms: [
        { english: "Simulation", japanese: "シミュレーション", track: "PD", subcategory: "Simulation & Virtual Validation" },
        { english: "Simulation-Driven Design", japanese: "シミュレーション駆動設計", track: "PD", subcategory: "Simulation & Virtual Validation" },
        { english: "Computer-Aided Engineering", japanese: "CAE", track: "PD", subcategory: "Simulation & Virtual Validation" },
        { english: "Numerical Analysis", japanese: "数値解析", track: "PD", subcategory: "Simulation & Virtual Validation" },
        { english: "Finite Element Analysis", japanese: "有限要素解析", track: "PD", subcategory: "Simulation & Virtual Validation" },
        { english: "Computational Fluid Dynamics", japanese: "流体解析", track: "PD", subcategory: "Simulation & Virtual Validation" },
        { english: "Thermal Analysis", japanese: "熱解析", track: "PD", subcategory: "Simulation & Virtual Validation" },
        { english: "Structural Analysis", japanese: "構造解析", track: "PD", subcategory: "Simulation & Virtual Validation" },
        { english: "Digital Twin", japanese: "デジタルツイン", track: "PD", subcategory: "Simulation & Virtual Validation" },
        { english: "Virtual Validation", japanese: "仮想検証", track: "PD", subcategory: "Simulation & Virtual Validation" },
        { english: "Virtual Prototyping", japanese: "バーチャル試作", track: "PD", subcategory: "Simulation & Virtual Validation" },
      ],
    },
    {
      id: "prototyping-testing",
      name: "Prototyping & Testing",
      terms: [
        { english: "Prototype", japanese: "試作", track: "PD", subcategory: "Prototyping & Testing" },
        { english: "Testing", japanese: "試験", track: "PD", subcategory: "Prototyping & Testing" },
        { english: "Validation", japanese: "妥当性確認", track: "PD", subcategory: "Prototyping & Testing" },
        { english: "Design Verification", japanese: "設計検証", track: "PD", subcategory: "Prototyping & Testing" },
      ],
    },
  ],
};

// ============================================================================
// Track 2: Production Engineering (PE) - 5 subcategories
// ============================================================================

export const PE_TRACK: Track = {
  id: "pe",
  name: "Production Engineering (PE)",
  subcategories: [
    {
      id: "production-prep",
      name: "Production Preparation & Planning",
      terms: [
        { english: "Production Engineering", japanese: "生産技術", notes: "NOT 'manufacturing technology'", track: "PE", subcategory: "Production Preparation & Planning" },
        { english: "Production Preparation", japanese: "生産準備", track: "PE", subcategory: "Production Preparation & Planning" },
        { english: "Mass Production Preparation", japanese: "量産準備", track: "PE", subcategory: "Production Preparation & Planning" },
        { english: "Production Launch", japanese: "立ち上げ", track: "PE", subcategory: "Production Preparation & Planning" },
        { english: "24-Month Process", japanese: "24ヶ月工程", track: "PE", subcategory: "Production Preparation & Planning" },
        { english: "Standardization", japanese: "標準化", track: "PE", subcategory: "Production Preparation & Planning" },
        { english: "Toyota Manufacturing Standard", japanese: "トヨタ生産標準", track: "PE", subcategory: "Production Preparation & Planning" },
        { english: "Toyota Manufacturing Rules", japanese: "TMR", track: "PE", subcategory: "Production Preparation & Planning" },
        { english: "Toyota Manufacturing Standards", japanese: "TMS", track: "PE", subcategory: "Production Preparation & Planning" },
        { english: "Work Standard", japanese: "作業標準", track: "PE", subcategory: "Production Preparation & Planning" },
        { english: "Operation Drawing", japanese: "工程図", notes: "NOT design drawing", track: "PE", subcategory: "Production Preparation & Planning" },
        { english: "Manufacturing Drawing", japanese: "工作図面", track: "PE", subcategory: "Production Preparation & Planning" },
        { english: "Jig Drawing", japanese: "治具図", track: "PE", subcategory: "Production Preparation & Planning" },
        { english: "QC Process Chart", japanese: "QC工程表", track: "PE", subcategory: "Production Preparation & Planning" },
        { english: "Quality Standard", japanese: "品質標準", track: "PE", subcategory: "Production Preparation & Planning" },
        { english: "Product Drawing", japanese: "製品図面", track: "PE", subcategory: "Production Preparation & Planning" },
      ],
    },
    {
      id: "process-design",
      name: "Process Design & Equipment Planning",
      terms: [
        { english: "Process Design", japanese: "工程設計", track: "PE", subcategory: "Process Design & Equipment Planning" },
        { english: "Process Flow", japanese: "工程フロー", track: "PE", subcategory: "Process Design & Equipment Planning" },
        { english: "Operation Sequence", japanese: "作業順序", track: "PE", subcategory: "Process Design & Equipment Planning" },
        { english: "Equipment Planning", japanese: "設備計画", track: "PE", subcategory: "Process Design & Equipment Planning" },
        { english: "Machine Tool", japanese: "工作機械", track: "PE", subcategory: "Process Design & Equipment Planning" },
        { english: "Equipment Specification", japanese: "設備仕様", track: "PE", subcategory: "Process Design & Equipment Planning" },
        { english: "Production Capacity", japanese: "生産能力", track: "PE", subcategory: "Process Design & Equipment Planning" },
      ],
    },
    {
      id: "tooling",
      name: "Tooling Engineering",
      subAreas: [
        {
          id: "cutting-fundamentals",
          name: "Cutting & Machining Fundamentals",
          terms: [
            { english: "Machining", japanese: "機械加工", track: "PE", subcategory: "Tooling Engineering", subArea: "Cutting & Machining Fundamentals" },
            { english: "Metal Cutting", japanese: "切削加工", track: "PE", subcategory: "Tooling Engineering", subArea: "Cutting & Machining Fundamentals" },
          ],
        },
        {
          id: "tool-design",
          name: "Tool Design & Materials",
          terms: [
            { english: "Tool", japanese: "工具", track: "PE", subcategory: "Tooling Engineering", subArea: "Tool Design & Materials" },
            { english: "Tooling Technology", japanese: "工具技術", track: "PE", subcategory: "Tooling Engineering", subArea: "Tool Design & Materials" },
            { english: "Cutting Tools", japanese: "切削工具", track: "PE", subcategory: "Tooling Engineering", subArea: "Tool Design & Materials" },
            { english: "Tool Design", japanese: "工具設計", track: "PE", subcategory: "Tooling Engineering", subArea: "Tool Design & Materials" },
            { english: "Tool Materials", japanese: "工具材料", track: "PE", subcategory: "Tooling Engineering", subArea: "Tool Design & Materials" },
            { english: "Tool Material", japanese: "工具材", track: "PE", subcategory: "Tooling Engineering", subArea: "Tool Design & Materials" },
          ],
        },
        {
          id: "cutting-theory",
          name: "Cutting Theory & Phenomena",
          terms: [
            { english: "Cutting Theory", japanese: "切削理論", track: "PE", subcategory: "Tooling Engineering", subArea: "Cutting Theory & Phenomena" },
            { english: "Cutting Phenomena", japanese: "切削現象", track: "PE", subcategory: "Tooling Engineering", subArea: "Cutting Theory & Phenomena" },
            { english: "Mechanisms of Cutting", japanese: "切削機構", track: "PE", subcategory: "Tooling Engineering", subArea: "Cutting Theory & Phenomena" },
            { english: "Chip Formation", japanese: "切りくず生成", track: "PE", subcategory: "Tooling Engineering", subArea: "Cutting Theory & Phenomena" },
            { english: "Chip Control", japanese: "切りくず処理", track: "PE", subcategory: "Tooling Engineering", subArea: "Cutting Theory & Phenomena" },
          ],
        },
        {
          id: "tool-performance",
          name: "Tool Performance & Evaluation",
          terms: [
            { english: "Cutting Conditions", japanese: "切削条件", track: "PE", subcategory: "Tooling Engineering", subArea: "Tool Performance & Evaluation" },
            { english: "Cutting Speed", japanese: "切削速度", track: "PE", subcategory: "Tooling Engineering", subArea: "Tool Performance & Evaluation" },
            { english: "Tool Wear", japanese: "工具摩耗", track: "PE", subcategory: "Tooling Engineering", subArea: "Tool Performance & Evaluation" },
            { english: "Tool Life", japanese: "工具寿命", track: "PE", subcategory: "Tooling Engineering", subArea: "Tool Performance & Evaluation" },
            { english: "Machinability", japanese: "被削性", track: "PE", subcategory: "Tooling Engineering", subArea: "Tool Performance & Evaluation" },
            { english: "Work Material", japanese: "被削材", track: "PE", subcategory: "Tooling Engineering", subArea: "Tool Performance & Evaluation" },
            { english: "Difficult-to-Cut Materials", japanese: "難削材", track: "PE", subcategory: "Tooling Engineering", subArea: "Tool Performance & Evaluation" },
            { english: "Surface Roughness", japanese: "表面粗さ", track: "PE", subcategory: "Tooling Engineering", subArea: "Tool Performance & Evaluation" },
            { english: "Surface Finish Roughness", japanese: "仕上げ面粗さ", track: "PE", subcategory: "Tooling Engineering", subArea: "Tool Performance & Evaluation" },
            { english: "Machining Accuracy", japanese: "加工精度", track: "PE", subcategory: "Tooling Engineering", subArea: "Tool Performance & Evaluation" },
            { english: "Dimensional Accuracy", japanese: "寸法精度", track: "PE", subcategory: "Tooling Engineering", subArea: "Tool Performance & Evaluation" },
          ],
        },
        {
          id: "jigs-fixtures",
          name: "Jigs, Fixtures & Workholding",
          terms: [
            { english: "Tooling Engineering", japanese: "ツーリングエンジニアリング", track: "PE", subcategory: "Tooling Engineering", subArea: "Jigs, Fixtures & Workholding" },
            { english: "Jig", japanese: "治具", notes: "NOT 'tool'", track: "PE", subcategory: "Tooling Engineering", subArea: "Jigs, Fixtures & Workholding" },
            { english: "Jig Design", japanese: "治具設計", track: "PE", subcategory: "Tooling Engineering", subArea: "Jigs, Fixtures & Workholding" },
            { english: "Workholding Fixtures", japanese: "取付具", track: "PE", subcategory: "Tooling Engineering", subArea: "Jigs, Fixtures & Workholding" },
            { english: "Cutting Tool (shop floor)", japanese: "刃具", track: "PE", subcategory: "Tooling Engineering", subArea: "Jigs, Fixtures & Workholding" },
            { english: "Positioning", japanese: "位置決め", track: "PE", subcategory: "Tooling Engineering", subArea: "Jigs, Fixtures & Workholding" },
            { english: "Inspection Fixture", japanese: "検査治具", track: "PE", subcategory: "Tooling Engineering", subArea: "Jigs, Fixtures & Workholding" },
            { english: "Poka-Yoke", japanese: "ポカヨケ", track: "PE", subcategory: "Tooling Engineering", subArea: "Jigs, Fixtures & Workholding" },
            { english: "Fixture", japanese: "固定具", track: "PE", subcategory: "Tooling Engineering", subArea: "Jigs, Fixtures & Workholding" },
            { english: "Clamp", japanese: "クランプ", track: "PE", subcategory: "Tooling Engineering", subArea: "Jigs, Fixtures & Workholding" },
          ],
        },
        {
          id: "tool-management",
          name: "Tool Management",
          terms: [
            { english: "Tool Management", japanese: "工具管理", track: "PE", subcategory: "Tooling Engineering", subArea: "Tool Management" },
            { english: "Cutting Edge Management", japanese: "刃先管理", track: "PE", subcategory: "Tooling Engineering", subArea: "Tool Management" },
          ],
        },
      ],
    },
    {
      id: "manufacturing-processes",
      name: "Manufacturing Processes & Precision",
      terms: [
        { english: "Machining Technology", japanese: "加工技術", track: "PE", subcategory: "Manufacturing Processes & Precision" },
        { english: "Process Physics", japanese: "加工物理", track: "PE", subcategory: "Manufacturing Processes & Precision" },
        { english: "Processing Method", japanese: "加工方法", track: "PE", subcategory: "Manufacturing Processes & Precision" },
        { english: "Grinding", japanese: "研削", track: "PE", subcategory: "Manufacturing Processes & Precision" },
        { english: "Grinding Machine", japanese: "研削盤", track: "PE", subcategory: "Manufacturing Processes & Precision" },
        { english: "Grinding Wheel", japanese: "砥石", track: "PE", subcategory: "Manufacturing Processes & Precision" },
        { english: "Polishing", japanese: "研磨", track: "PE", subcategory: "Manufacturing Processes & Precision" },
        { english: "Grinder", japanese: "グラインダ", track: "PE", subcategory: "Manufacturing Processes & Precision" },
        { english: "Cutting", japanese: "切削", track: "PE", subcategory: "Manufacturing Processes & Precision" },
        { english: "Cutting Force", japanese: "切削力", track: "PE", subcategory: "Manufacturing Processes & Precision" },
        { english: "Casting", japanese: "鋳造", track: "PE", subcategory: "Manufacturing Processes & Precision" },
        { english: "Pressing", japanese: "プレス", track: "PE", subcategory: "Manufacturing Processes & Precision" },
        { english: "Plastic Working", japanese: "塑性加工", track: "PE", subcategory: "Manufacturing Processes & Precision" },
        { english: "Thermal Effect", japanese: "熱影響", track: "PE", subcategory: "Manufacturing Processes & Precision" },
        { english: "Material Flow", japanese: "材料流動", track: "PE", subcategory: "Manufacturing Processes & Precision" },
        { english: "Lathe", japanese: "旋盤", track: "PE", subcategory: "Manufacturing Processes & Precision" },
        { english: "Milling Machine", japanese: "フライス盤", track: "PE", subcategory: "Manufacturing Processes & Precision" },
        { english: "Drilling Machine", japanese: "ボール盤", track: "PE", subcategory: "Manufacturing Processes & Precision" },
        { english: "Machining Center", japanese: "マシニングセンタ", track: "PE", subcategory: "Manufacturing Processes & Precision" },
        { english: "Cutting Tool (blade)", japanese: "刃物", track: "PE", subcategory: "Manufacturing Processes & Precision" },
        { english: "Process Capability", japanese: "工程能力", track: "PE", subcategory: "Manufacturing Processes & Precision" },
        { english: "Cp/Cpk", japanese: "Cp/Cpk", track: "PE", subcategory: "Manufacturing Processes & Precision" },
        { english: "Precision Management", japanese: "精度管理", track: "PE", subcategory: "Manufacturing Processes & Precision" },
        { english: "Machine Accuracy", japanese: "機械精度", track: "PE", subcategory: "Manufacturing Processes & Precision" },
        { english: "Static Accuracy", japanese: "静的精度", track: "PE", subcategory: "Manufacturing Processes & Precision" },
      ],
    },
    {
      id: "supplier-collaboration",
      name: "Supplier Collaboration & Co-Development",
      terms: [
        { english: "Supplier Company", japanese: "協力会社", track: "PE", subcategory: "Supplier Collaboration & Co-Development" },
        { english: "Equipment Manufacturer", japanese: "設備メーカー", track: "PE", subcategory: "Supplier Collaboration & Co-Development" },
        { english: "Joint Development", japanese: "共同開発", track: "PE", subcategory: "Supplier Collaboration & Co-Development" },
      ],
    },
  ],
};

// ============================================================================
// Track 3: Manufacturing/Operations (TPS) - 6 subcategories
// ============================================================================

export const TPS_TRACK: Track = {
  id: "tps",
  name: "Manufacturing/Operations (TPS)",
  subcategories: [
    {
      id: "tps-core",
      name: "TPS Core System",
      terms: [
        { english: "Toyota Production System", japanese: "トヨタ生産方式", track: "TPS", subcategory: "TPS Core System" },
        { english: "TPS", japanese: "TPS", track: "TPS", subcategory: "TPS Core System" },
        { english: "Just-In-Time", japanese: "ジャストインタイム", track: "TPS", subcategory: "TPS Core System" },
        { english: "Jidoka", japanese: "自働化", notes: "Automation with human touch", track: "TPS", subcategory: "TPS Core System" },
        { english: "Kanban", japanese: "かんばん", track: "TPS", subcategory: "TPS Core System" },
      ],
    },
    {
      id: "kaizen",
      name: "Kaizen & Continuous Improvement",
      terms: [
        { english: "Kaizen", japanese: "カイゼン", track: "TPS", subcategory: "Kaizen & Continuous Improvement" },
        { english: "Process Improvement", japanese: "工程改善", track: "TPS", subcategory: "Kaizen & Continuous Improvement" },
        { english: "Equipment Improvement", japanese: "設備改善", track: "TPS", subcategory: "Kaizen & Continuous Improvement" },
        { english: "Methods Analysis", japanese: "方法分析", track: "TPS", subcategory: "Kaizen & Continuous Improvement" },
        { english: "Work Improvement", japanese: "作業改善", track: "TPS", subcategory: "Kaizen & Continuous Improvement" },
      ],
    },
    {
      id: "quality",
      name: "Quality Control & Assurance",
      terms: [
        { english: "Quality Control", japanese: "品質管理", track: "TPS", subcategory: "Quality Control & Assurance" },
        { english: "Quality Assurance", japanese: "品質保証", track: "TPS", subcategory: "Quality Control & Assurance" },
        { english: "Statistical Process Control", japanese: "統計的工程管理", track: "TPS", subcategory: "Quality Control & Assurance" },
        { english: "SPC", japanese: "SPC", track: "TPS", subcategory: "Quality Control & Assurance" },
        { english: "In-Process Inspection", japanese: "工程内検査", track: "TPS", subcategory: "Quality Control & Assurance" },
        { english: "Defect Prevention", japanese: "不良予防", track: "TPS", subcategory: "Quality Control & Assurance" },
      ],
    },
    {
      id: "daily-ops",
      name: "Daily Operations & Setup Reduction",
      terms: [
        { english: "Production Management", japanese: "生産管理", track: "TPS", subcategory: "Daily Operations & Setup Reduction" },
        { english: "Daily Management", japanese: "日常管理", track: "TPS", subcategory: "Daily Operations & Setup Reduction" },
        { english: "Manufacturing", japanese: "製造", track: "TPS", subcategory: "Daily Operations & Setup Reduction" },
        { english: "Setup Change", japanese: "段取り替え", track: "TPS", subcategory: "Daily Operations & Setup Reduction" },
        { english: "SMED", japanese: "SMED", track: "TPS", subcategory: "Daily Operations & Setup Reduction" },
        { english: "Setup Time Reduction", japanese: "段取り時間短縮", track: "TPS", subcategory: "Daily Operations & Setup Reduction" },
        { english: "External Setup", japanese: "外段取り", track: "TPS", subcategory: "Daily Operations & Setup Reduction" },
        { english: "Internal Setup", japanese: "内段取り", track: "TPS", subcategory: "Daily Operations & Setup Reduction" },
      ],
    },
    {
      id: "automation-measurement",
      name: "Automation & Measurement Systems",
      terms: [
        { english: "Automation", japanese: "自動化", track: "TPS", subcategory: "Automation & Measurement Systems" },
        { english: "Automation Technology", japanese: "自動化技術", track: "TPS", subcategory: "Automation & Measurement Systems" },
        { english: "Robot", japanese: "ロボット", track: "TPS", subcategory: "Automation & Measurement Systems" },
        { english: "Control", japanese: "制御", track: "TPS", subcategory: "Automation & Measurement Systems" },
        { english: "Control System", japanese: "制御システム", track: "TPS", subcategory: "Automation & Measurement Systems" },
        { english: "Sensor", japanese: "センサ", track: "TPS", subcategory: "Automation & Measurement Systems" },
        { english: "Manufacturing Execution System", japanese: "生産管理システム", track: "TPS", subcategory: "Automation & Measurement Systems" },
        { english: "Precision Measurement", japanese: "精密測定", track: "TPS", subcategory: "Automation & Measurement Systems" },
        { english: "Measurement", japanese: "測定", track: "TPS", subcategory: "Automation & Measurement Systems" },
        { english: "Measurement Technology", japanese: "測定技術", track: "TPS", subcategory: "Automation & Measurement Systems" },
        { english: "Instrumentation", japanese: "計測", track: "TPS", subcategory: "Automation & Measurement Systems" },
        { english: "Inspection", japanese: "検査", track: "TPS", subcategory: "Automation & Measurement Systems" },
        { english: "Three-Dimensional Measurement", japanese: "三次元測定", track: "TPS", subcategory: "Automation & Measurement Systems" },
      ],
    },
    {
      id: "three-pillar",
      name: "3 Pillar Activity System",
      terms: [
        { english: "3 Pillar Activity", japanese: "3本柱活動", track: "TPS", subcategory: "3 Pillar Activity System" },
        { english: "Thoroughness and Revision of Standardized Work", japanese: "標準作業の徹底と改訂", track: "TPS", subcategory: "3 Pillar Activity System" },
        { english: "Autonomous Maintenance", japanese: "自主保全", track: "TPS", subcategory: "3 Pillar Activity System" },
        { english: "Cutting Point Management", japanese: "加工点マネジメント", track: "TPS", subcategory: "3 Pillar Activity System" },
      ],
    },
  ],
};

// ============================================================================
// Cross-Cutting Terms - 2 subcategories
// ============================================================================

export const CROSS_CUTTING_TRACK: Track = {
  id: "cross-cutting",
  name: "Cross-Cutting Terms",
  subcategories: [
    {
      id: "management",
      name: "Management Systems",
      terms: [
        { english: "Chief Engineer System", japanese: "主査制度", track: "Cross-Cutting", subcategory: "Management Systems" },
        { english: "Chief Engineer", japanese: "チーフエンジニア", track: "Cross-Cutting", subcategory: "Management Systems" },
        { english: "Obeya", japanese: "大部屋", notes: "War Room / Integration Space", track: "Cross-Cutting", subcategory: "Management Systems" },
      ],
    },
    {
      id: "digital-transformation",
      name: "Digital Transformation",
      terms: [
        { english: "Digital Transformation", japanese: "デジタル化", track: "Cross-Cutting", subcategory: "Digital Transformation" },
        { english: "DX", japanese: "DX", track: "Cross-Cutting", subcategory: "Digital Transformation" },
        { english: "Industry 4.0", japanese: "Industry 4.0", track: "Cross-Cutting", subcategory: "Digital Transformation" },
        { english: "Internet of Things", japanese: "IoT", track: "Cross-Cutting", subcategory: "Digital Transformation" },
      ],
    },
  ],
};

// ============================================================================
// Aggregated Data
// ============================================================================

export const ALL_TRACKS: Track[] = [
  PD_TRACK,
  PE_TRACK,
  TPS_TRACK,
  CROSS_CUTTING_TRACK,
];

/**
 * Get all terms flattened from all tracks
 */
export function getAllTerms(): ResearchTerm[] {
  const terms: ResearchTerm[] = [];

  for (const track of ALL_TRACKS) {
    for (const subcategory of track.subcategories) {
      if (subcategory.terms) {
        terms.push(...subcategory.terms);
      }
      if (subcategory.subAreas) {
        for (const subArea of subcategory.subAreas) {
          terms.push(...subArea.terms);
        }
      }
    }
  }

  return terms;
}

/**
 * Get terms for a specific track
 */
export function getTermsForTrack(trackId: string): ResearchTerm[] {
  const track = ALL_TRACKS.find(t => t.id === trackId);
  if (!track) return [];

  const terms: ResearchTerm[] = [];
  for (const subcategory of track.subcategories) {
    if (subcategory.terms) {
      terms.push(...subcategory.terms);
    }
    if (subcategory.subAreas) {
      for (const subArea of subcategory.subAreas) {
        terms.push(...subArea.terms);
      }
    }
  }

  return terms;
}

/**
 * Get terms for a specific subcategory
 */
export function getTermsForSubcategory(trackId: string, subcategoryId: string): ResearchTerm[] {
  const track = ALL_TRACKS.find(t => t.id === trackId);
  if (!track) return [];

  const subcategory = track.subcategories.find(s => s.id === subcategoryId);
  if (!subcategory) return [];

  const terms: ResearchTerm[] = [];
  if (subcategory.terms) {
    terms.push(...subcategory.terms);
  }
  if (subcategory.subAreas) {
    for (const subArea of subcategory.subAreas) {
      terms.push(...subArea.terms);
    }
  }

  return terms;
}

/**
 * Get terms for a specific sub-area within a subcategory
 */
export function getTermsForSubArea(trackId: string, subcategoryId: string, subAreaId: string): ResearchTerm[] {
  const track = ALL_TRACKS.find(t => t.id === trackId);
  if (!track) return [];

  const subcategory = track.subcategories.find(s => s.id === subcategoryId);
  if (!subcategory || !subcategory.subAreas) return [];

  const subArea = subcategory.subAreas.find(sa => sa.id === subAreaId);
  if (!subArea) return [];

  return subArea.terms;
}

/**
 * Search terms by English or Japanese text
 */
export function searchTerms(query: string, languageFilter: "english" | "japanese" | "both" = "both"): ResearchTerm[] {
  const lowerQuery = query.toLowerCase();
  const allTerms = getAllTerms();

  return allTerms.filter(term => {
    if (languageFilter === "english") {
      return term.english.toLowerCase().includes(lowerQuery);
    } else if (languageFilter === "japanese") {
      return term.japanese.includes(query);
    } else {
      // Search both
      return term.english.toLowerCase().includes(lowerQuery) || term.japanese.includes(query);
    }
  });
}

/**
 * Get term count statistics
 */
export function getTermStats() {
  const allTerms = getAllTerms();
  const byTrack = ALL_TRACKS.map(track => ({
    track: track.name,
    count: getTermsForTrack(track.id).length,
    subcategories: track.subcategories.map(sub => ({
      name: sub.name,
      count: getTermsForSubcategory(track.id, sub.id).length,
    })),
  }));

  return {
    total: allTerms.length,
    byTrack,
  };
}
