const path = require('path');
const fs = require('fs');
// const defaultResolver = require('jest-resolve/build/defaultResolver').default;
const Resolver = require('jest-resolve');


module.exports = (request, options) => {
    const { basedir, extensions = ['.js', '.jsx', '.ts', '.tsx', '.cjs', '.mjs', '.json'] } = options;
    if (!Array.isArray(extensions)) throw new Error('extensions must be an array');
    if (extensions.map(e => typeof e).some(t => t !== 'string')) throw new Error('extensions must be an array of strings');
    console.log("resolving", request, "from", basedir === "/home/dev/Documents/Git/Tonomy/Tonomy-ID-Integration/Tonomy-ID-SDK" ? "." : basedir)

    if (extensions.some(ext => request.endsWith(ext)) && fs.existsSync(request)) return request;

    try {
        const resolver = new Resolver(options);
        return resolver.resolveModule(request, basedir);
        // return defaultResolver(request, options);
    } catch (e) {
        console.log(`Package ${request} not found in ${basedir}`)
        const modulePath = path.join(basedir, 'node_modules', request);
        const packageJsonPath = path.join(modulePath, 'package.json');

        console.log('Checking package.json at', packageJsonPath)
        if (fs.existsSync(packageJsonPath)) {
            const packageJson = require(packageJsonPath);
            if (packageJson.exports && typeof packageJson.exports === 'object') {
                console.log('Checking exports in package.json', packageJson.exports)
                const exportPath = packageJson.exports.import || packageJson.exports['.']?.import;
                if (exportPath) {
                    for (const ext of extensions) {
                        const resolvedPath = path.join(modulePath, exportPath);
                        console.log('Checking export path', resolvedPath, ext)
                        if (fs.existsSync(resolvedPath) && resolvedPath.endsWith(ext)) {
                            return resolvedPath;
                        }
                    }
                }
            } else if (packageJson.main) {
                console.log('resolving from main')
                const mainPath = path.join(modulePath, packageJson.main);
                if (fs.existsSync(mainPath)) {
                    return mainPath;
                }
            }
        }
        throw e;
    }
};
