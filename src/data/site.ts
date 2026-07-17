export type CareerFact = {
  label: string;
  value: string;
};

export type CareerEntry = {
  kicker: string;
  meta: string;
  title: string;
  entity: string;
  location: string;
  lead: string;
  facts: CareerFact[];
  visual: string;
  visualLabel: string;
  tags: string[];
  note: string;
};

export const careerEntries: CareerEntry[] = [
  {
    kicker: 'Archive 01 / Education',
    meta: '年份范围待补充',
    title: '教育阶段',
    entity: '院校名称待补充',
    location: '城市待补充 / China',
    lead: '学习方向、专业背景与对技术产生兴趣的过程待补充。',
    facts: [
      { label: '学习内容', value: '专业、课程与研究方向待补充。' },
      { label: '实践项目', value: '校园项目或个人实践待补充。' },
      { label: '能力形成', value: '技术基础与设计意识待补充。' },
      { label: '阶段成果', value: '真实且可核验的成果待补充。' },
    ],
    visual: 'Black & White Image',
    visualLabel: '教育阶段黑白图片待补充',
    tags: ['专业待补充', '课程待补充', '项目待补充'],
    note: '每段经历都作为独立档案保存，不虚构未知信息。',
  },
  {
    kicker: 'Archive 02 / Career Start',
    meta: '年份范围待补充',
    title: '职业起点',
    entity: '公司名称待补充',
    location: '工作地点待补充',
    lead: '第一段正式职业经历与前端工程实践待补充。',
    facts: [
      { label: '职位', value: '职位名称与职责范围待补充。' },
      { label: '核心项目', value: '代表项目及业务背景待补充。' },
      { label: '技术栈', value: '实际使用的框架与工具待补充。' },
      { label: '成果', value: '可验证的交付结果待补充。' },
    ],
    visual: 'Project Image',
    visualLabel: '职业起点项目截图待补充',
    tags: ['框架待补充', '工程化待补充', '协作方式待补充'],
    note: 'Archive 02 / First professional station.',
  },
  {
    kicker: 'Archive 03 / Growth',
    meta: '年份范围待补充',
    title: '成长阶段',
    entity: '公司名称待补充',
    location: '工作地点待补充',
    lead: '从功能交付走向系统设计与复杂项目协作的阶段待补充。',
    facts: [
      { label: '工作内容', value: '职责升级与工作边界待补充。' },
      { label: '负责项目', value: '复杂项目及承担角色待补充。' },
      { label: '解决问题', value: '技术难题与方案过程待补充。' },
      { label: '获得成果', value: '质量、效率或业务结果待补充。' },
    ],
    visual: 'Case Study Image',
    visualLabel: '成长阶段项目图片待补充',
    tags: ['架构待补充', '性能待补充', '团队协作待补充'],
    note: 'Archive 03 / Responsibility and systems thinking.',
  },
  {
    kicker: 'Archive 04 / AI Journey',
    meta: '年份范围待补充',
    title: 'AI 探索',
    entity: '项目或组织待补充',
    location: '地点待补充',
    lead: '围绕 AI 产品体验、前端交互与工程落地的探索待补充。',
    facts: [
      { label: '探索方向', value: 'AI 相关学习与实践主题待补充。' },
      { label: '产品实践', value: '真实 AI 项目与用户场景待补充。' },
      { label: '技术组合', value: '模型、前端与服务集成待补充。' },
      { label: '阶段结论', value: '已验证的方法与认知待补充。' },
    ],
    visual: 'AI Project Image',
    visualLabel: 'AI 探索项目截图待补充',
    tags: ['AI 方向待补充', '交互待补充', '产品待补充'],
    note: 'Archive 04 / Human-centered AI exploration.',
  },
  {
    kicker: 'Archive 05 / Today',
    meta: '当前状态待补充',
    title: '现在与下一站',
    entity: '当前身份待补充',
    location: '所在地待补充',
    lead: '当前关注方向、合作方式与下一阶段目标待补充。',
    facts: [
      { label: '正在关注', value: '当前技术与产品方向待补充。' },
      { label: '工作方式', value: '协作偏好与可参与范围待补充。' },
      { label: '持续建设', value: '长期项目或内容计划待补充。' },
      { label: '下一站', value: '职业目标与期待机会待补充。' },
    ],
    visual: 'Portrait / Workspace',
    visualLabel: '当前阶段个人图片待补充',
    tags: ['方向待补充', '合作待补充', '目标待补充'],
    note: '档案仍在继续，下一页由新的经历写入。',
  },
];

export const blogCategories = [
  '全部',
  'AI',
  'Frontend',
  'React',
  'TypeScript',
  'Engineering',
  'Design',
  'Tools',
  'Life',
];
