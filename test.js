const fs = require("fs");
const path = require("path");

// Hàm tìm file config.json đi ngược tối đa 10 cấp thư mục
function findConfigFile(fileName = "config.json", startDir = __dirname, maxDepth = 10) {
    let currentDir = startDir;

    for (let i = 0; i < maxDepth; i++) {
        const possiblePath = path.join(currentDir, fileName);
        if (fs.existsSync(possiblePath)) {
            return possiblePath;
        }
        currentDir = path.resolve(currentDir, "..");
    }

    return null;
}

// Thực thi tìm file
const configPath = findConfigFile();

if (configPath) {
    console.log("✅ Đã tìm thấy config.json tại:");
    console.log(configPath);
} else {
    console.error("❌ Không tìm thấy file config.json trong tối đa 10 cấp thư mục trên.");
}
