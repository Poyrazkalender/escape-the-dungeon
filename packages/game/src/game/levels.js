import level1 from './levels/level1.json';
//import { level2 } from './levels/level2';
import level2 from './levels/level2.json'; // ✅ JSON dosyasını bu şekilde import ediyoruz


// Yeni seviyeler ekledikçe buraya import edip diziye ekleyeceksin
export const LEVELS = [level1,level2];