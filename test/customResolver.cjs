module.exports = (request, options) => {
    function removeRootDir(path) {
        if (path.startsWith(options.rootDir)) return path.slice(options.rootDir.length)
        return path
    }
    console.log(`Resolving module "${removeRootDir(request)}" imported by "${removeRootDir(options.basedir)}"`);
    return options.defaultResolver(request, options);
};