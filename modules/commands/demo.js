const path = require('path');
const fs = require('fs');

function findFile(filename, maxLevelsUp = 5) {
    let foundPath = null;
    for (let i = 0; i <= maxLevelsUp; i++) {
        let tryPath = path.resolve(__dirname, `${'../'.repeat(i)}data/${filename}`);
        console.log(`🔎 Đang kiểm tra: ${tryPath}`);
        if (fs.existsSync(tryPath)) {
            foundPath = tryPath;
            console.log(`✅ Đã tìm thấy file "${filename}" tại: ${foundPath}`);
            break;
        }
    }
    if (!foundPath) {
        console.log(`❌ Không tìm thấy file ${filename} sau khi lùi ${maxLevelsUp} cấp từ ${__dirname}`);
        process.exit(1); // Thoát luôn nếu không tìm thấy
    }
    return foundPath;
}

// Tự tìm file thuebot.json và RentKey.json
const dataPath = findFile('thuebot.json');
const keyPath = findFile('RentKey.json');
