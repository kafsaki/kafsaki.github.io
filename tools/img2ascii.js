/**
 * 图片转字符画工具 - 开发者后台工具
 * 用法: node tools/img2ascii.js <图片路径> [输出目录]
 *
 * 功能:
 * 1. 保持原始宽高比转换图片为字符画
 * 2. 提取每个字符位置的颜色
 * 3. 输出 JSON 数据到 source/data/ascii/ 目录
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// 字符集：从暗到亮排列
const CHAR_SET = " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";

// 默认列数（宽度固定，行数根据比例自动计算）
const DEFAULT_COLS = 200;
// 字符宽高比：等宽字体字符宽度 ≈ 高度 × 0.5
const CHAR_ASPECT = 0.5;

/**
 * 获取字符块的平均颜色
 */
function getBlockAverage(pixels, blockX, blockY, blockW, blockH, imgW) {
  let r = 0, g = 0, b = 0, count = 0;
  for (let y = blockY; y < blockY + blockH && y < (pixels.length / (imgW * 3)); y++) {
    for (let x = blockX; x < blockX + blockW && x < imgW; x++) {
      const idx = (y * imgW + x) * 3;
      r += pixels[idx];
      g += pixels[idx + 1];
      b += pixels[idx + 2];
      count++;
    }
  }
  if (count === 0) return { r: 0, g: 0, b: 0 };
  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count)
  };
}

/**
 * 计算亮度值 (0-255)
 */
function getBrightness(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * 将图片转换为字符画数据，保持原始宽高比
 */
async function imageToAscii(imagePath, options = {}) {
  const cols = options.cols || DEFAULT_COLS;

  // 先获取原始图片尺寸
  const meta = await sharp(imagePath).metadata();
  const imgW = meta.width;
  const imgH = meta.height;

  // 保持视觉宽高比：cols * CHAR_ASPECT / rows = imgW / imgH
  // 即 rows = cols * CHAR_ASPECT * imgH / imgW
  const rows = Math.max(1, Math.round(cols * CHAR_ASPECT * imgH / imgW));

  console.log(`原始尺寸: ${imgW}x${imgH}, 字符网格: ${cols}x${rows}`);

  // 读取并缩放图片（保持比例）
  const { data, info } = await sharp(imagePath)
    .resize(cols, rows, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = data;
  const scaledW = info.width;
  const scaledH = info.height;

  const charGrid = [];
  const colorGrid = [];

  for (let row = 0; row < rows; row++) {
    let charRow = '';
    const colorRow = [];
    const blockY = Math.floor(row * (scaledH / rows));

    for (let col = 0; col < cols; col++) {
      const blockX = Math.floor(col * (scaledW / cols));

      // 直接取缩放后像素的平均值
      const blockW = Math.max(1, Math.floor(scaledW / cols));
      const blockH = Math.max(1, Math.floor(scaledH / rows));
      const avg = getBlockAverage(pixels, blockX, blockY, blockW, blockH, scaledW);
      const brightness = getBrightness(avg.r, avg.g, avg.b);

      const charIdx = Math.min(
        CHAR_SET.length - 1,
        Math.max(0, Math.floor((brightness / 255) * (CHAR_SET.length - 1)))
      );
      charRow += CHAR_SET[charIdx];

      const hex = '#' +
        avg.r.toString(16).padStart(2, '0') +
        avg.g.toString(16).padStart(2, '0') +
        avg.b.toString(16).padStart(2, '0');
      colorRow.push(hex);
    }
    charGrid.push(charRow);
    colorGrid.push(colorRow);
  }

  return { cols, rows, chars: charGrid, colors: colorGrid };
}

/**
 * 提取图片的主色调
 */
async function extractDominantColor(imagePath) {
  const { data } = await sharp(imagePath)
    .resize(1, 1)
    .raw()
    .toBuffer({ resolveWithObject: true });

  return '#' +
    data[0].toString(16).padStart(2, '0') +
    data[1].toString(16).padStart(2, '0') +
    data[2].toString(16).padStart(2, '0');
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('用法: node tools/img2ascii.js <图片路径> [输出目录]');
    console.log('示例: node tools/img2ascii.js source/img/DarkRoom.jpg');
    process.exit(1);
  }

  const imagePath = args[0];
  const outputDir = args[1] || 'source/data/ascii';

  if (!fs.existsSync(imagePath)) {
    console.error(`错误: 图片不存在 - ${imagePath}`);
    process.exit(1);
  }

  const imageName = path.basename(imagePath, path.extname(imagePath));
  const outputPath = path.join(outputDir, `${imageName}.json`);

  console.log(`正在转换: ${imagePath}`);

  try {
    const asciiData = await imageToAscii(imagePath);
    const dominantColor = await extractDominantColor(imagePath);

    const output = {
      name: imageName,
      source: path.basename(imagePath),
      dominantColor,
      ...asciiData
    };

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`已保存: ${outputPath}`);
    console.log(`主色调: ${dominantColor}`);
  } catch (err) {
    console.error(`转换失败: ${err.message}`);
    process.exit(1);
  }
}

main();