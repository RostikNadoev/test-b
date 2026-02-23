// find_params_v3.cjs
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const TARGET_BUTTONS = {
    1: { name: "1-я кнопка (x30 левая)", found: false, x: null, vx: null },
    2: { name: "2-я кнопка (x15)", found: false, x: null, vx: null },
    3: { name: "3-я кнопка (x8)", found: false, x: null, vx: null },
    13: { name: "13-я кнопка (x30 правая)", found: false, x: null, vx: null }
};

const SEARCH_RANGES = {
    1: { x: { min: -0.05, max: 0.0, step: 0.0005 }, vx: { min: -0.02, max: 0.02, step: 0.0005 } },
    2: { x: { min: -0.03, max: 0.02, step: 0.0005 }, vx: { min: -0.015, max: 0.015, step: 0.0005 } },
    3: { x: { min: -0.02, max: 0.03, step: 0.0005 }, vx: { min: -0.01, max: 0.01, step: 0.0005 } },
    13: { x: { min: 0.04, max: 0.09, step: 0.0005 }, vx: { min: -0.05, max: 0.01, step: 0.0005 } }
};

let currentButton = null;
let currentX = null;
let currentVx = null;
let attempts = 0;
let totalCombinations = 0;

function updateLaunchConfig(x, vx) {
    const filePath = 'src/components/NeonPlinko.jsx';
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Ищем и обновляем LAUNCH_CONFIG
        const regex = /(LAUNCH_CONFIG\s*=\s*\{\s*current:\s*\{)\s*x:\s*-?\d+\.?\d*,\s*vx:\s*-?\d+\.?\d*/;
        const replacement = `$1 x: ${x.toFixed(6)}, vx: ${vx.toFixed(6)}`;
        
        content = content.replace(regex, replacement);
        fs.writeFileSync(filePath, content);
        
        console.log(`\n📝 [${attempts}/${totalCombinations}] x=${x.toFixed(6)}, vx=${vx.toFixed(6)}`);
        
        // Сохраняем текущие параметры
        currentX = x;
        currentVx = vx;
        
        return true;
    } catch (error) {
        console.error('❌ Ошибка обновления:', error.message);
        return false;
    }
}

async function searchForButton(buttonNum) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎯 Ищем для ${TARGET_BUTTONS[buttonNum].name}`);
    console.log(`${'='.repeat(60)}`);
    
    const range = SEARCH_RANGES[buttonNum];
    currentButton = buttonNum;
    attempts = 0;
    
    // Считаем общее количество комбинаций
    let xCount = 0;
    let vxCount = 0;
    for (let x = range.x.min; x <= range.x.max; x += range.x.step) xCount++;
    for (let vx = range.vx.min; vx <= range.vx.max; vx += range.vx.step) vxCount++;
    totalCombinations = xCount * vxCount;
    
    console.log(`📊 Всего комбинаций: ${totalCombinations}`);
    console.log('🟢 Нажимай Enter для следующей комбинации');
    console.log('   Или введи номер кнопки если попал (1,2,3,13)');
    console.log('   Или "q" для выхода\n');
    
    // Генерируем значения для перебора
    for (let x = range.x.min; x <= range.x.max; x += range.x.step) {
        x = Number(x.toFixed(6));
        
        for (let vx = range.vx.min; vx <= range.vx.max; vx += range.vx.step) {
            vx = Number(vx.toFixed(6));
            attempts++;
            
            updateLaunchConfig(x, vx);
            
            // Ждем ввод пользователя
            const input = await prompt('');
            
            if (input.toLowerCase() === 'q') {
                return false;
            }
            
            // Если ввели число - проверяем не попали ли мы в нужную кнопку
            const num = parseInt(input);
            if (!isNaN(num) && [1, 2, 3, 13].includes(num)) {
                if (num === buttonNum) {
                    console.log(`  ✅ НАШЛИ! x=${x}, vx=${vx}`);
                    TARGET_BUTTONS[buttonNum].found = true;
                    TARGET_BUTTONS[buttonNum].x = x;
                    TARGET_BUTTONS[buttonNum].vx = vx;
                    saveResult(buttonNum, x, vx);
                    return true;
                } else {
                    // Попали в другую кнопку - тоже сохраняем
                    console.log(`  ⚡ Попали в кнопку ${num} - сохраняем`);
                    saveResult(num, x, vx);
                    TARGET_BUTTONS[num].found = true;
                    TARGET_BUTTONS[num].x = x;
                    TARGET_BUTTONS[num].vx = vx;
                }
            }
            
            // Если просто Enter - продолжаем
        }
    }
    
    return false;
}

function saveResult(buttonNum, x, vx) {
    const result = {
        button: buttonNum,
        name: TARGET_BUTTONS[buttonNum]?.name || `Кнопка ${buttonNum}`,
        x: x,
        vx: vx,
        timestamp: new Date().toLocaleString()
    };
    
    let existing = [];
    try {
        if (fs.existsSync('plinko_params_found.json')) {
            existing = JSON.parse(fs.readFileSync('plinko_params_found.json', 'utf8'));
        }
    } catch (e) {}
    
    existing.push(result);
    fs.writeFileSync('plinko_params_found.json', JSON.stringify(existing, null, 2));
    console.log(`💾 Сохранено в plinko_params_found.json`);
}

function prompt(question) {
    return new Promise((resolve) => {
        rl.question(question, resolve);
    });
}

async function main() {
    console.log("🎮 ПОИСК ПАРАМЕТРОВ ПЛИНКО v3");
    console.log("=".repeat(60));
    console.log("📌 Инструкция:");
    console.log("1. В первой консоли запусти: npm run dev");
    console.log("2. Открой игру в браузере");
    console.log("3. В ЭТОЙ консоли будет меняться файл");
    console.log("4. ПОСЛЕ каждого изменения - обновляй страницу (F5)");
    console.log("5. Жми DROP и смотри результат");
    console.log("6. Введи номер кнопки если попал, или просто Enter для продолжения");
    console.log("=".repeat(60));
    
    await prompt("\n🟢 Нажми Enter для начала...");
    
    // Выбираем какую кнопку ищем первой
    console.log("\n🔍 Какую кнопку ищем первой?");
    console.log("1 - x30 (левая)");
    console.log("2 - x15");
    console.log("3 - x8");
    console.log("13 - x30 (правая)");
    console.log("0 - искать все подряд");
    
    const choice = parseInt(await prompt("Твой выбор: "));
    
    if (choice === 0) {
        // Ищем все по очереди
        for (const btn of [1, 2, 3, 13]) {
            if (!TARGET_BUTTONS[btn].found) {
                await searchForButton(btn);
            }
        }
    } else if ([1, 2, 3, 13].includes(choice)) {
        await searchForButton(choice);
    } else {
        console.log("❌ Неверный выбор");
    }
    
    // Выводим результаты
    console.log("\n\n📊 ИТОГОВЫЕ РЕЗУЛЬТАТЫ:");
    console.log("=".repeat(60));
    
    for (const btn of [1, 2, 3, 13]) {
        if (TARGET_BUTTONS[btn].found) {
            console.log(`✅ ${TARGET_BUTTONS[btn].name}: x=${TARGET_BUTTONS[btn].x}, vx=${TARGET_BUTTONS[btn].vx}`);
        } else {
            console.log(`❌ ${TARGET_BUTTONS[btn].name}: НЕ НАЙДЕНО`);
        }
    }
    
    console.log("\n📝 ГОТОВЫЕ СТРОКИ ДЛЯ ПРЕСЕТА:");
    console.log("=".repeat(60));
    for (const btn of [1, 2, 3, 13]) {
        if (TARGET_BUTTONS[btn].found) {
            console.log(`${btn}: x ${TARGET_BUTTONS[btn].x.toFixed(4)} vx ${TARGET_BUTTONS[btn].vx.toFixed(4)}`);
        }
    }
    
    rl.close();
}

main();