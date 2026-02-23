// Пресеты для BounceFall (Plinko)
// Индексация исходов: 1..14 (как в спецификации бэкенда)
// 1 = miss (мимо) → x0
// 2 = x30
// 3 = x15
// 4 = x8
// 5 = x3
// 6 = x1.5
// 7 = x0.6
// 8 = x0.2
// 9 = x0.6
// 10 = x1.5
// 11 = x3
// 12 = x8
// 13 = x15
// 14 = x30

export const BOUNCE_FALL_PRESETS = {
  1: [ // miss (мимо) → x0
    { x: 0.0157, vx: -0.0011 },
    { x: -0.004, vx: -0.0491 },
    { x: -0.0495, vx: -0.0185 }
  ],
  2: [ // x30
    { x: -0.05, vx: 0.011 }
  ],
  3: [ // x15
    { x: -0.049, vx: -0.02 }
  ],
  4: [ // x8
    { x: -0.049, vx: -0.007 },
    { x: -0.0485, vx: -0.005 }
  ],
  5: [ // x3
    { x: -0.002, vx: -0.01 },
    { x: 0.0157, vx: 0.0011 },
    { x: -0.049, vx: 0.0195 }
  ],
  6: [ // x1.5
    { x: -0.0034, vx: -0.01 },
    { x: -0.05, vx: 0.02 },
    { x: -0.049, vx: 0.018 }
  ],
  7: [ // x0.6
    { x: 0.0095, vx: 0.0045 },
    { x: 0.0, vx: -0.0191 },
    { x: -0.05, vx: 0.0811 }
  ],
  8: [ // x0.2
    { x: -0.0095, vx: 0.0044 },
    { x: 0.0155, vx: 0.0015 },
    { x: -0.0197, vx: 0.0091 },
    { x: -0.049, vx: -0.0065 },
    { x: -0.0485, vx: -0.008 }
  ],
  9: [ // x0.6
    { x: -0.0032, vx: -0.01 },
    { x: 0.0157, vx: 0.0015 },
    { x: -0.049, vx: -0.0025 }
  ],
  10: [ // x1.5
    { x: -0.0075, vx: -0.0444 },
    { x: 0.0195, vx: 0.0045 },
    { x: -0.0057, vx: -0.0031 }
  ],
  11: [ // x3
    { x: -0.0497, vx: -0.0091 },
    { x: 0.0, vx: 0.0811 },
    { x: -0.004, vx: -0.0691 },
    { x: -0.01, vx: -0.035 }
  ],
  12: [ // x8
    { x: -0.005, vx: 0.0691 },
    { x: 0.021, vx: -0.027227 },
    { x: -0.049, vx: 0.0025 }
  ],
  13: [ // x15
    { x: -0.0031, vx: -0.01 },
    { x: -0.0035, vx: -0.05 },
    { x: 0.0, vx: 0.0441 },
    { x: -0.0485, vx: -0.0085 }
  ],
  14: [ // x30
    { x: -0.0485, vx: -0.01 }
  ]
};

// Функция для получения случайного пресета по индексу исхода
export function getRandomPreset(outcomeIndex) {
  const presets = BOUNCE_FALL_PRESETS[outcomeIndex];
  if (!presets || presets.length === 0) {
    console.warn(`⚠️ No presets found for outcome index ${outcomeIndex}, using default`);
    return { x: -0.0485, vx: -0.005 }; // дефолтный пресет
  }
  
  const randomIndex = Math.floor(Math.random() * presets.length);
  const preset = presets[randomIndex];
  
  console.log(`🎯 Selected preset for outcome ${outcomeIndex}:`, preset);
  return preset;
}