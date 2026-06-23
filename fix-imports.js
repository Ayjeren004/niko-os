const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(fullPath));
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            results.push(fullPath);
        }
    });
    return results;
}

const files = walkDir(path.join(__dirname, 'src'));

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace the nextauth route import with @/lib/auth
    const regex1 = /import\s+\{\s*authOptions\s*\}\s+from\s+['"](?:\.\.\/)+auth\/\[\.\.\.nextauth\]\/route['"];?/g;
    const regex2 = /import\s+\{\s*authOptions\s*\}\s+from\s+['"](?:\.\.\/)*api\/auth\/\[\.\.\.nextauth\]\/route['"];?/g;
    
    if (regex1.test(content) || regex2.test(content)) {
        console.log('Fixing:', file);
        content = content.replace(regex1, "import { authOptions } from '@/lib/auth';");
        content = content.replace(regex2, "import { authOptions } from '@/lib/auth';");
        fs.writeFileSync(file, content, 'utf8');
    }
});
console.log('Done');
