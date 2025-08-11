// Quick script to remove TypeScript syntax from JavaScript files
const fs = require('fs');
const path = require('path');

function removeTypescriptSyntax(content) {
    // Remove type annotations
    content = content.replace(/:\s*[A-Za-z_][A-Za-z0-9_<>|[\],\s]*(?=\s*[=;(){])/g, '');
    content = content.replace(/:\s*[A-Za-z_][A-Za-z0-9_<>|[\],\s]*$/gm, '');
    
    // Remove private/public/protected modifiers
    content = content.replace(/\b(private|public|protected)\s+/g, '');
    
    // Remove interface/type imports
    content = content.replace(/import\s*{\s*[^}]*}\s*from\s*['"][^'"]*types[^'"]*['"];?\s*\n?/g, '');
    
    // Remove return type annotations
    content = content.replace(/\):\s*[A-Za-z_][A-Za-z0-9_<>|[\],\s]*\s*{/g, ') {');
    
    // Remove variable type annotations
    content = content.replace(/(\w+):\s*[A-Za-z_][A-Za-z0-9_<>|[\],\s]*(\s*[=;])/g, '$1$2');
    
    // Remove generic type parameters
    content = content.replace(/<[A-Za-z_][A-Za-z0-9_,\s]*>/g, '');
    
    // Remove interface declarations
    content = content.replace(/export\s+interface\s+\w+\s*{[^}]*}/gs, '');
    
    // Remove type aliases
    content = content.replace(/export\s+type\s+\w+\s*=.*?;/g, '');
    
    return content;
}

// Process all JS files
const jsFiles = [
    'src/main.js',
    'src/game/state.js',
    'src/game/types.js'
];

jsFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const cleaned = removeTypescriptSyntax(content);
        fs.writeFileSync(filePath, cleaned);
        console.log(`Fixed ${filePath}`);
    }
});

console.log('TypeScript syntax removal complete!');
